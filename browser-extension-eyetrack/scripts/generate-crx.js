#!/usr/bin/env node

/**
 * Generate CRX file for Chrome Extension
 * Creates a signed CRX package that can be distributed outside Chrome Web Store
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

/**
 * Generate or load RSA key pair for signing
 */
function getOrGenerateKeyPair() {
  const keyPath = path.join(rootDir, 'key.pem');
  const pubKeyPath = path.join(rootDir, 'key.pub');
  
  if (!fs.existsSync(keyPath)) {
    console.log('🔑 Generating new RSA key pair for CRX signing...');
    
    // Generate 2048-bit RSA key pair
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    
    fs.writeFileSync(keyPath, privateKey);
    fs.writeFileSync(pubKeyPath, publicKey);
    
    console.log('✅ Key pair generated and saved');
    console.log('⚠️  IMPORTANT: Keep key.pem private and secure!');
    console.log('    Add key.pem to .gitignore to prevent accidental commits');
    
    // Add to .gitignore if not already there
    const gitignorePath = path.join(rootDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf8');
      if (!gitignore.includes('key.pem')) {
        fs.appendFileSync(gitignorePath, '\n# Chrome extension private key\nkey.pem\n');
        console.log('✅ Added key.pem to .gitignore');
      }
    }
    
    return { privateKey, publicKey };
  } else {
    console.log('🔑 Using existing key pair');
    const privateKey = fs.readFileSync(keyPath, 'utf8');
    
    // Generate public key if missing
    if (!fs.existsSync(pubKeyPath)) {
      const keyObject = crypto.createPrivateKey(privateKey);
      const publicKey = crypto.createPublicKey(keyObject).export({
        type: 'spki',
        format: 'pem'
      });
      fs.writeFileSync(pubKeyPath, publicKey);
    }
    
    const publicKey = fs.readFileSync(pubKeyPath, 'utf8');
    return { privateKey, publicKey };
  }
}

/**
 * Generate Chrome Extension ID from public key
 */
function generateExtensionId(publicKey) {
  const keyObject = crypto.createPublicKey(publicKey);
  const keyDer = keyObject.export({ type: 'spki', format: 'der' });
  const hash = crypto.createHash('sha256').update(keyDer).digest();
  
  // Convert first 16 bytes to extension ID format
  const alphabet = 'abcdefghijklmnop';
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += alphabet[Math.floor(hash[i] / 16)];
  }
  
  return id;
}

/**
 * Create CRX3 file manually (without external dependencies)
 * Based on CRX3 specification: https://developer.chrome.com/docs/extensions/mv3/hosting/
 */
function createCRX3(distDir, privateKeyPem, outputPath) {
  console.log('📦 Creating CRX3 package...');
  
  // Create ZIP of extension
  const zipPath = path.join(rootDir, 'temp-extension.zip');
  
  if (process.platform === 'win32') {
    // Windows: Use tar (available in Windows 10+)
    execSync(`cd "${distDir}" && tar -a -c -f "${zipPath}" *`, { stdio: 'inherit' });
  } else {
    // Unix: Use zip command
    execSync(`cd "${distDir}" && zip -qr "${zipPath}" .`, { stdio: 'inherit' });
  }
  
  const zipBuffer = fs.readFileSync(zipPath);
  
  // Create signed header for CRX3
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  
  // CRX3 Magic Number
  const magic = Buffer.from('Cr24', 'utf8');
  const version = Buffer.from([3, 0, 0, 0]); // Version 3
  
  // Create signed data
  const signedData = Buffer.concat([
    Buffer.from('CRX3 SignedData\x00', 'utf8'),
    Buffer.from([zipBuffer.length & 0xff, (zipBuffer.length >> 8) & 0xff, 
                 (zipBuffer.length >> 16) & 0xff, (zipBuffer.length >> 24) & 0xff]),
    zipBuffer
  ]);
  
  // Sign the data
  const signature = crypto.sign('sha256', signedData, privateKey);
  
  // Get public key in DER format
  const publicKey = crypto.createPublicKey(privateKey);
  const publicKeyDer = publicKey.export({ type: 'spki', format: 'der' });
  
  // Build header size (simplified for basic CRX3)
  const headerSize = 12 + publicKeyDer.length + signature.length + 16;
  const headerSizeBuffer = Buffer.alloc(4);
  headerSizeBuffer.writeUInt32LE(headerSize, 0);
  
  // Build CRX file
  const crxBuffer = Buffer.concat([
    magic,
    version,
    headerSizeBuffer,
    publicKeyDer,
    signature,
    zipBuffer
  ]);
  
  fs.writeFileSync(outputPath, crxBuffer);
  
  // Clean up temp file
  fs.unlinkSync(zipPath);
  
  console.log(`✅ CRX3 file created: ${outputPath}`);
  return crxBuffer;
}

/**
 * Alternative: Use chrome binary to pack extension (if available)
 */
function createCRXWithChrome(distDir, keyPath, outputPath) {
  console.log('📦 Creating CRX with Chrome binary...');
  
  // Find Chrome executable
  let chromePath;
  if (process.platform === 'win32') {
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
    ];
    chromePath = possiblePaths.find(p => fs.existsSync(p));
  } else if (process.platform === 'darwin') {
    chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else {
    chromePath = 'google-chrome';
  }
  
  if (!chromePath || !fs.existsSync(chromePath)) {
    throw new Error('Chrome browser not found. Please install Chrome or use manual CRX generation.');
  }
  
  // Pack extension using Chrome
  const command = `"${chromePath}" --pack-extension="${distDir}" --pack-extension-key="${keyPath}"`;
  execSync(command, { stdio: 'inherit' });
  
  // Chrome creates the CRX next to the dist directory
  const generatedCrx = distDir + '.crx';
  if (fs.existsSync(generatedCrx)) {
    fs.renameSync(generatedCrx, outputPath);
    console.log(`✅ CRX file created: ${outputPath}`);
  } else {
    throw new Error('Chrome failed to create CRX file');
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🎯 Chrome Extension CRX Generator\n');
  
  // Check if dist directory exists
  const distDir = path.join(rootDir, 'dist');
  if (!fs.existsSync(distDir)) {
    console.error('❌ Error: dist/ directory not found. Run npm run build first.');
    process.exit(1);
  }
  
  // Get or generate key pair
  const { privateKey, publicKey } = getOrGenerateKeyPair();
  
  // Generate extension ID
  const extensionId = generateExtensionId(publicKey);
  console.log(`📦 Extension ID: ${extensionId}`);
  
  // Get version from manifest
  const manifestPath = path.join(distDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const version = manifest.version;
  
  // Output paths
  const crxPath = path.join(rootDir, `cogix-eye-tracking-extension-v${version}.crx`);
  const latestCrxPath = path.join(rootDir, 'cogix-eye-tracking-extension.crx');
  
  try {
    // Try using Chrome first (most reliable)
    if (process.argv.includes('--use-chrome')) {
      createCRXWithChrome(distDir, path.join(rootDir, 'key.pem'), crxPath);
    } else {
      // Try using crx3 npm package if available
      try {
        const crx3Available = execSync('npm list -g crx3', { encoding: 'utf8' });
        if (crx3Available.includes('crx3')) {
          console.log('📦 Using crx3 npm package...');
          execSync(`crx3 "${distDir}" -o "${crxPath}" -k "${path.join(rootDir, 'key.pem')}"`, { stdio: 'inherit' });
          console.log(`✅ CRX file created: ${crxPath}`);
        }
      } catch {
        // Fallback to manual CRX3 generation
        console.log('⚠️  crx3 package not found, using manual generation...');
        console.log('   For better results, install: npm install -g crx3');
        createCRX3(distDir, privateKey, crxPath);
      }
    }
    
    // Copy to latest version
    fs.copyFileSync(crxPath, latestCrxPath);
    console.log(`✅ Latest CRX: ${latestCrxPath}`);
    
    // Generate checksum
    const crxBuffer = fs.readFileSync(crxPath);
    const checksum = crypto.createHash('sha256').update(crxBuffer).digest('hex');
    console.log(`\n🔐 SHA256: ${checksum}`);
    
    // Save metadata
    const metadata = {
      extensionId,
      version,
      checksum,
      fileSize: crxBuffer.length,
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(rootDir, 'crx-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    console.log('\n✅ CRX generation complete!');
    console.log('\n📋 Distribution:');
    console.log('1. Users can install by dragging the CRX file to chrome://extensions/');
    console.log('2. Or by using Chrome flags: --load-extension=path/to/crx');
    console.log(`3. Extension ID for updates: ${extensionId}`);
    
  } catch (error) {
    console.error('❌ Error generating CRX:', error.message);
    console.log('\n💡 Alternatives:');
    console.log('1. Install crx3 globally: npm install -g crx3');
    console.log('2. Use Chrome to pack: node scripts/generate-crx.js --use-chrome');
    console.log('3. Distribute as ZIP for manual installation');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});