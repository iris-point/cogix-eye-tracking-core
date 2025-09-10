#!/usr/bin/env node

/**
 * Generate Chrome Extension ID from manifest key
 * The ID is deterministic based on the public key
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Characters used in Chrome extension IDs
const ALPHABET = 'abcdefghijklmnop';

function generateExtensionId(publicKey) {
  // Hash the public key
  const hash = crypto.createHash('sha256').update(publicKey).digest();
  
  // Take first 16 bytes and convert to extension ID format
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += ALPHABET[Math.floor(hash[i] / 16)];
  }
  
  return id;
}

function getOrGenerateKey() {
  const keyPath = path.join(__dirname, '..', 'key.pem');
  const pubKeyPath = path.join(__dirname, '..', 'key.pub');
  
  if (!fs.existsSync(keyPath)) {
    console.log('🔑 Generating new key pair...');
    
    // Generate key pair using crypto module
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
    return publicKey;
  } else {
    // Read existing public key
    if (!fs.existsSync(pubKeyPath)) {
      // Extract public key from private key
      const privateKey = fs.readFileSync(keyPath, 'utf8');
      const keyObject = crypto.createPrivateKey(privateKey);
      const publicKey = crypto.createPublicKey(keyObject).export({
        type: 'spki',
        format: 'pem'
      });
      
      fs.writeFileSync(pubKeyPath, publicKey);
      return publicKey;
    }
    
    return fs.readFileSync(pubKeyPath, 'utf8');
  }
}

// Main execution
console.log('🎯 Cogix Eye Tracking Extension ID Generator\n');

const publicKey = getOrGenerateKey();
const extensionId = generateExtensionId(publicKey);

console.log('📦 Extension ID:', extensionId);
console.log('\nThis ID will remain constant as long as you use the same key pair.');
console.log('Keep your key.pem file safe and private!');

// Update manifest with key if needed
const manifestPath = path.join(__dirname, '..', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Convert public key to base64 for manifest
  const pubKeyDer = crypto.createPublicKey(publicKey).export({
    type: 'spki',
    format: 'der'
  });
  const pubKeyBase64 = pubKeyDer.toString('base64');
  
  if (!manifest.key) {
    manifest.key = pubKeyBase64;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('\n✅ Manifest updated with public key');
  }
}

// Export for use in other scripts
export { generateExtensionId, getOrGenerateKey };