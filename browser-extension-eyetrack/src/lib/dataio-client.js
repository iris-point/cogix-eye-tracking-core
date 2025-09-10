/**
 * DataIO Client for Browser Extension
 * Handles eye tracking data submission to cogix-data-io worker
 * 
 * Workflow:
 * 1. Fetch API key using shared NextAuth session
 * 2. Upload video to cogix-backend to get CDN URL
 * 3. Create TrackingSession JSON with video URL
 * 4. Submit complete JSON to cogix-data-io
 */

class DataIOClient {
  constructor(config) {
    this.config = {
      backendUrl: config.backendUrl || 'https://api.cogix.app',
      dataIOUrl: config.dataIOUrl || 'https://data-io.cogix.app',
      projectId: config.projectId,
      userId: config.userId,
      participantId: config.participantId || 'anonymous'
    };
  }

  /**
   * Check if user is logged in to Cogix with Clerk
   */
  async isAuthenticated() {
    try {
      // Try multiple domains where user might be logged in
      const domains = [
        'app.cogix.com',
        'localhost'
      ];
      
      for (const domain of domains) {
        const cookies = await chrome.cookies.getAll({ domain });
        
        // Look for Clerk session cookies
        const clerkSessionCookie = cookies.find(c => 
          c.name === '__session' ||                    // Clerk's main session cookie
          c.name === '__clerk_client' ||               // Clerk client cookie
          c.name.startsWith('__client_uat') ||         // Clerk user auth token
          c.name.startsWith('__session_')              // Clerk session with suffix
        );
        
        if (clerkSessionCookie) {
          console.log('Found Clerk session cookie from domain:', domain);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check authentication:', error);
      return false;
    }
  }

  /**
   * Get Clerk JWT token from browser session
   * Extracts the session token that can be sent as Bearer token to backend
   */
  async getAuthToken() {
    try {
      // Check multiple possible domains where user might be logged in
      const domains = [
        'app.cogix.com',
        'localhost'
      ];
      
      for (const domain of domains) {
        const cookies = await chrome.cookies.getAll({ domain });
        
        // Look for Clerk session cookie that contains the JWT
        const clerkSessionCookie = cookies.find(c => 
          c.name === '__session' ||                    // Clerk's main session cookie
          c.name.startsWith('__session_')              // Clerk session with suffix
        );
        
        if (clerkSessionCookie) {
          console.log('Found Clerk session cookie from domain:', domain);
          
          // The Clerk session cookie value IS the JWT token
          // that can be used as Bearer token with the backend
          return clerkSessionCookie.value;
        }
        
        // Alternative: Look for client-side auth token
        const clerkClientCookie = cookies.find(c => 
          c.name === '__clerk_client' ||
          c.name.startsWith('__client_uat')
        );
        
        if (clerkClientCookie) {
          console.log('Found Clerk client cookie from domain:', domain);
          // This might contain the token or a reference to it
          // May need to decode/parse the value
          return clerkClientCookie.value;
        }
      }
      
      // If no cookies found, try to get token from running Clerk instance
      // This requires executing script in the context of the website
      try {
        const token = await this.getClerkTokenFromWebsite();
        if (token) {
          return token;
        }
      } catch (error) {
        console.log('Could not get token from website context:', error.message);
      }
      
      throw new Error('No Clerk authentication session found. Please log in to Cogix website first.');
    } catch (error) {
      console.error('Failed to get Clerk auth token:', error);
      throw error;
    }
  }

  /**
   * Get Clerk token from website by executing script in page context
   */
  async getClerkTokenFromWebsite() {
    return new Promise((resolve, reject) => {
      // Try to get token from active Cogix tab
      chrome.tabs.query({ url: '*://app.cogix.com/*' }, async (tabs) => {
        if (tabs.length === 0) {
          // Try localhost
          chrome.tabs.query({ url: '*://localhost:3000/*' }, async (localTabs) => {
            if (localTabs.length === 0) {
              reject(new Error('No Cogix tabs found'));
              return;
            }
            await this.executeClerkScript(localTabs[0].id, resolve, reject);
          });
          return;
        }
        
        await this.executeClerkScript(tabs[0].id, resolve, reject);
      });
    });
  }

  /**
   * Execute script in page context to get Clerk session token
   */
  async executeClerkScript(tabId, resolve, reject) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          // This runs in the page context where Clerk is available
          try {
            // Try to get token from window.__clerk if available
            if (window.__clerk && window.__clerk.session) {
              return window.__clerk.session.getToken();
            }
            
            // Try alternative ways to get the token
            if (window.Clerk && window.Clerk.session) {
              return window.Clerk.session.getToken();
            }
            
            return null;
          } catch (error) {
            console.error('Error getting Clerk token:', error);
            return null;
          }
        }
      });
      
      if (results && results[0] && results[0].result) {
        resolve(results[0].result);
      } else {
        reject(new Error('Could not extract Clerk token from page'));
      }
    } catch (error) {
      reject(error);
    }
  }

  /**
   * Open Cogix login page in a new tab
   */
  async openLoginPage() {
    const loginUrl = this.config.backendUrl.includes('localhost') 
      ? 'http://localhost:3000/login'
      : 'https://app.cogix.com/login';
    
    await chrome.tabs.create({ url: loginUrl });
  }

  /**
   * Fetch API key for the project (on-demand, not cached)
   */
  async fetchApiKey() {
    const token = await this.getAuthToken();
    
    try {
      // First, try to get existing API keys
      const response = await fetch(
        `${this.config.backendUrl}/api/v1/api-keys?project_id=${this.config.projectId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch API keys: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Look for an existing browser extension key
      if (data.api_keys && data.api_keys.length > 0) {
        const extensionKey = data.api_keys.find(
          k => k.name === 'Browser Extension Key' || k.name === 'Default Project Key'
        );
        
        if (extensionKey && extensionKey.key) {
          return extensionKey.key;
        }
      }

      // Create a new API key if none exists
      console.log('Creating new API key for project:', this.config.projectId);
      const createResponse = await fetch(
        `${this.config.backendUrl}/api/v1/api-keys`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'Browser Extension Key',
            project_id: this.config.projectId,
            permissions: ['read', 'write'],
            scope: 'data_submission',
            expires_in_days: 365
          })
        }
      );

      if (!createResponse.ok) {
        throw new Error(`Failed to create API key: ${createResponse.statusText}`);
      }

      const newKey = await createResponse.json();
      return newKey.api_key;
    } catch (error) {
      console.error('Failed to fetch API key:', error);
      throw error;
    }
  }

  /**
   * Upload video to cogix-backend and get CDN URL
   */
  async uploadVideo(videoBlob, sessionId) {
    const token = await this.getAuthToken();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `eye-tracking-recordings/${sessionId}/${timestamp}.webm`;

    try {
      // Get signed upload URL from backend
      const signedUrlResponse = await fetch(
        `${this.config.backendUrl}/api/v1/projects/${this.config.projectId}/files/signed-upload-url`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename,
            content_type: 'video/webm',
            file_type: 'video'
          })
        }
      );

      if (!signedUrlResponse.ok) {
        throw new Error(`Failed to get upload URL: ${signedUrlResponse.statusText}`);
      }

      const { upload_url, public_url } = await signedUrlResponse.json();

      // Upload video to R2 using signed URL
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/webm'
        },
        body: videoBlob
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload video: ${uploadResponse.statusText}`);
      }

      console.log('Video uploaded successfully:', public_url);
      return public_url;
    } catch (error) {
      console.error('Failed to upload video:', error);
      throw error;
    }
  }

  /**
   * Submit complete eye tracking session to cogix-data-io
   */
  async submitSession(sessionData) {
    console.log('Starting session submission process...');

    try {
      // Step 1: Upload video if present and get CDN URL
      let videoUrl = null;
      if (sessionData.videoBlob) {
        console.log('Uploading video to get CDN URL...');
        videoUrl = await this.uploadVideo(sessionData.videoBlob, sessionData.sessionId);
      }

      // Step 2: Fetch API key (on-demand, not cached)
      console.log('Fetching API key for project...');
      const apiKey = await this.fetchApiKey();

      // Step 3: Create TrackingSession JSON with video URL
      const trackingSession = {
        id: sessionData.sessionId,
        version: '1.0.0',
        timestamp: Date.now(),
        
        metadata: {
          name: sessionData.name || `Recording ${new Date().toLocaleString()}`,
          duration: sessionData.duration,
          sampleRate: 60,
          recordedAt: sessionData.startTime,
          provider: 'webcam',
          mediaType: 'video',
          participant: {
            id: sessionData.participantId || this.config.participantId,
            name: sessionData.participantName
          },
          tags: ['browser-extension', 'cogix'],
          ...sessionData.metadata
        },
        
        mediaTrack: {
          type: 'video',
          duration: sessionData.duration,
          width: 1920,
          height: 1080,
          video: videoUrl ? {
            url: videoUrl,
            format: 'webm',
            codec: 'vp9',
            bitrate: 2500000,
            framerate: 30
          } : undefined
        },
        
        gazeData: sessionData.gazeData,
        fixations: sessionData.fixations || [],
        saccades: sessionData.saccades || [],
        aois: sessionData.aois || []
      };

      // Step 4: Submit to cogix-data-io
      const participantId = sessionData.participantId || this.config.participantId;
      const dataIOUrl = `${this.config.dataIOUrl}/${this.config.userId}/${this.config.projectId}/${participantId}/${sessionData.sessionId}`;

      console.log('Submitting session JSON to cogix-data-io:', dataIOUrl);

      const response = await fetch(dataIOUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${apiKey}`,
          'X-Client': 'browser-extension'
        },
        body: JSON.stringify({
          data: trackingSession,
          metadata: {
            source: 'browser-extension',
            version: chrome.runtime.getManifest().version,
            browser: navigator.userAgent,
            videoUrl: videoUrl,
            uploadedAt: new Date().toISOString(),
            projectId: this.config.projectId,
            userId: this.config.userId
          }
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(`Failed to submit session: ${error.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('Session submitted successfully:', result);

      return result;
    } catch (error) {
      console.error('Failed to submit session:', error);
      throw error;
    }
  }

  /**
   * Retrieve a session from cogix-data-io
   */
  async getSession(sessionId, participantId) {
    const apiKey = await this.fetchApiKey();
    const participant = participantId || this.config.participantId;
    
    const url = `${this.config.dataIOUrl}/${this.config.userId}/${this.config.projectId}/${participant}/${sessionId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `ApiKey ${apiKey}`,
        'X-Client': 'browser-extension'
      }
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to retrieve session: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * List all sessions for the project
   */
  async listSessions() {
    const apiKey = await this.fetchApiKey();
    const url = `${this.config.dataIOUrl}/${this.config.userId}/${this.config.projectId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `ApiKey ${apiKey}`,
        'X-Client': 'browser-extension'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list sessions: ${response.statusText}`);
    }

    const result = await response.json();
    return result.results || [];
  }

  /**
   * Get list of projects for the user
   */
  async getProjects() {
    const token = await this.getAuthToken();
    
    const response = await fetch(
      `${this.config.backendUrl}/api/v1/projects`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data.projects || [];
  }

  /**
   * Get current user info
   */
  async getCurrentUser() {
    const token = await this.getAuthToken();
    
    const response = await fetch(
      `${this.config.backendUrl}/api/v1/users/me`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Export for use in background script  
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataIOClient;
}

// Export for service worker context
if (typeof self !== 'undefined' && typeof importScripts !== 'undefined') {
  self.DataIOClient = DataIOClient;
}

// ES6 export for module imports
if (typeof window !== 'undefined') {
  window.DataIOClient = DataIOClient;
}

// For ES6 modules (if supported)
export default DataIOClient;
export { DataIOClient };