/**
 * Simple HTTP server for testing eye tracking without Live Server interference
 * Usage: node server.js
 * Then open: http://localhost:8080/demo.html
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Check for command line arguments
const args = process.argv.slice(2);
const mainPage = args.find(arg => arg.startsWith('--main='))?.split('=')[1];
const PORT = args.find(arg => arg.startsWith('--port='))?.split('=')[1] || 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.JPG': 'image/jpeg',  // Handle uppercase
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`Request for ${req.url}`);
    
    // Decode URL to handle Chinese characters and spaces
    let filePath = decodeURIComponent(req.url);
    
    // Default to index.html or emotion experiment if specified
    if (filePath === '/') {
        if (mainPage === 'emotion-experiment') {
            // Serve the emotion experiment index.html directly
            filePath = '/index.html';
        } else {
            filePath = '/index.html';
        }
    }
    
    // Handle paths - serve from various folders
    if (mainPage === 'emotion-experiment') {
        // When serving emotion experiment, handle special paths
        if (filePath.startsWith('/dist/')) {
            filePath = path.join(__dirname, '..', filePath);
        } else if (filePath.startsWith('/jspsych-plugin/')) {
            filePath = path.join(__dirname, '..', filePath);
        } else if (filePath.startsWith('/jspsych-extension/')) {
            filePath = path.join(__dirname, '..', filePath);
        } else {
            // Everything else comes from the emotion experiment folder
            filePath = path.join(__dirname, '..', 'eye-tracking-emotion-experiment', filePath);
        }
    } else {
        // Normal demo server mode
        if (filePath.startsWith('/dist/')) {
            filePath = path.join(__dirname, '..', filePath);
        } else if (filePath.startsWith('/jspsych-plugin/')) {
            filePath = path.join(__dirname, '..', filePath);
        } else if (filePath.startsWith('/jspsych-extension/')) {
            filePath = path.join(__dirname, '..', filePath);
        } else if (filePath === '/emotion-experiment.html' || filePath.startsWith('/assets/')) {
            // Serve emotion experiment files from the submodule
            if (filePath === '/emotion-experiment.html') {
                filePath = path.join(__dirname, '..', 'eye-tracking-emotion-experiment', 'index.html');
            } else if (filePath.startsWith('/assets/')) {
                // Serve assets from emotion experiment folder
                filePath = path.join(__dirname, '..', 'eye-tracking-emotion-experiment', filePath);
            }
        } else {
            filePath = path.join(__dirname, filePath);
        }
    }
    
    const extname = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                // Allow CORS for local testing
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content, 'utf-8');
        }
    });
});

// Function to get local IP addresses
function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }
    
    return addresses;
}

server.listen(PORT, HOST, () => {
    const localIPs = getLocalIPs();
    
    const displayPage = mainPage === 'emotion-experiment' ? 'Emotion Regulation Experiment' : 'Eye Tracking Demos';
    
    console.log(`
╔════════════════════════════════════════════════════════╗
║  Eye Tracking Demo Server                              ║
║  ${displayPage.padEnd(54)} ║
║                                                        ║
║  Server running on port ${PORT}                           ║
║                                                        ║
║  Access from this computer:                           ║
║  → http://localhost:${PORT}/                                ║
║                                                        ║`);
    
    if (mainPage !== 'emotion-experiment') {
        console.log(`║  Available demos:                                     ║
║  → http://localhost:${PORT}/demo.html                  ║
║  → http://localhost:${PORT}/jspsych-experiment.html    ║
║  → http://localhost:${PORT}/jspsych-demo.html          ║
║  → http://localhost:${PORT}/emotion-experiment.html    ║
║                                                        ║`);
    }
    
    if (localIPs.length > 0) {
        console.log(`║  Access from other devices on the network:            ║`);
        localIPs.forEach(ip => {
            console.log(`║  → http://${ip}:${PORT}/                               ║`);
        });
        console.log(`║                                                        ║`);
    }
    
    console.log(`║  This server does NOT inject WebSocket code,          ║
║  so it won't interfere with eye tracker connection.   ║
║                                                        ║
║  Note: Make sure your firewall allows port ${PORT}       ║
║  for network access from other devices.               ║
║                                                        ║
║  Press Ctrl+C to stop the server                      ║
╚════════════════════════════════════════════════════════╝
    `);
});