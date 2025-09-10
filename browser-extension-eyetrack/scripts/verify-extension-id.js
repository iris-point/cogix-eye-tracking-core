#!/usr/bin/env node

/**
 * Verify that the Extension ID matches the key pair
 * This ensures consistency across local and CI/CD builds
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const EXPECTED_ID = 'bgjkmeddgmjipccn';

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function generateExtensionId(publicKey) {
  const keyObject = crypto.createPublicKey(publicKey);
  const keyDer = keyObject.export({ type: 'spki', format: 'der' });
  const hash = crypto.createHash('sha256').update(keyDer).digest();
  
  const alphabet = 'abcdefghijklmnop';
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += alphabet[Math.floor(hash[i] / 16)];
  }
  
  return id;
}

function verifyFromPEM() {
  console.log('\n📋 Verifying from key.pem...\n');
  
  const keyPath = path.join(rootDir, 'key.pem');
  if (!fs.existsSync(keyPath)) {
    console.log(`${colors.red}❌ key.pem not found!${colors.reset}`);
    console.log('   Run "npm run package:crx" to generate it.\n');
    return false;
  }
  
  const privateKey = fs.readFileSync(keyPath, 'utf8');
  const keyObject = crypto.createPrivateKey(privateKey);
  const publicKey = crypto.createPublicKey(keyObject).export({
    type: 'spki',
    format: 'pem'
  });
  
  const actualId = generateExtensionId(publicKey);
  
  console.log(`Expected ID: ${colors.blue}${EXPECTED_ID}${colors.reset}`);
  console.log(`Actual ID:   ${colors.blue}${actualId}${colors.reset}`);
  
  if (actualId === EXPECTED_ID) {
    console.log(`${colors.green}✅ Extension ID matches! The key is correct.${colors.reset}\n`);
    return true;
  } else {
    console.log(`${colors.red}❌ Extension ID mismatch! This is the wrong key.${colors.reset}\n`);
    return false;
  }
}

function verifyFromPublic() {
  console.log('📋 Verifying from key.pub...\n');
  
  const pubPath = path.join(rootDir, 'key.pub');
  if (!fs.existsSync(pubPath)) {
    console.log(`${colors.yellow}⚠️  key.pub not found, skipping public key verification${colors.reset}\n`);
    return null;
  }
  
  const publicKey = fs.readFileSync(pubPath, 'utf8');
  const actualId = generateExtensionId(publicKey);
  
  console.log(`Expected ID: ${colors.blue}${EXPECTED_ID}${colors.reset}`);
  console.log(`Actual ID:   ${colors.blue}${actualId}${colors.reset}`);
  
  if (actualId === EXPECTED_ID) {
    console.log(`${colors.green}✅ Public key verification passed!${colors.reset}\n`);
    return true;
  } else {
    console.log(`${colors.red}❌ Public key produces different ID!${colors.reset}\n`);
    return false;
  }
}

function verifyFromBase64() {
  console.log('📋 Verifying from key.pem.base64...\n');
  
  const base64Path = path.join(rootDir, 'key.pem.base64');
  if (!fs.existsSync(base64Path)) {
    console.log(`${colors.yellow}⚠️  key.pem.base64 not found, skipping base64 verification${colors.reset}\n`);
    return null;
  }
  
  const base64Content = fs.readFileSync(base64Path, 'utf8').trim();
  const pemContent = Buffer.from(base64Content, 'base64').toString('utf8');
  
  const keyObject = crypto.createPrivateKey(pemContent);
  const publicKey = crypto.createPublicKey(keyObject).export({
    type: 'spki',
    format: 'pem'
  });
  
  const actualId = generateExtensionId(publicKey);
  
  console.log(`Expected ID: ${colors.blue}${EXPECTED_ID}${colors.reset}`);
  console.log(`Actual ID:   ${colors.blue}${actualId}${colors.reset}`);
  
  if (actualId === EXPECTED_ID) {
    console.log(`${colors.green}✅ Base64 key verification passed!${colors.reset}\n`);
    return true;
  } else {
    console.log(`${colors.red}❌ Base64 key produces different ID!${colors.reset}\n`);
    return false;
  }
}

function verifyFromCRXMetadata() {
  console.log('📋 Checking CRX metadata...\n');
  
  const metadataPath = path.join(rootDir, 'crx-metadata.json');
  if (!fs.existsSync(metadataPath)) {
    console.log(`${colors.yellow}⚠️  crx-metadata.json not found${colors.reset}`);
    console.log('   Run "npm run package:crx" to generate it.\n');
    return null;
  }
  
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  console.log(`Metadata ID: ${colors.blue}${metadata.extensionId}${colors.reset}`);
  console.log(`Version:     ${metadata.version}`);
  console.log(`Created:     ${metadata.createdAt}\n`);
  
  if (metadata.extensionId === EXPECTED_ID) {
    console.log(`${colors.green}✅ Metadata confirms correct Extension ID${colors.reset}\n`);
    return true;
  } else {
    console.log(`${colors.red}❌ Metadata shows different Extension ID${colors.reset}\n`);
    return false;
  }
}

function showGitHubSecretInstructions() {
  console.log('📌 GitHub Secret Verification:\n');
  console.log('To verify your GitHub secret is correct:');
  console.log('1. Go to your repo Settings → Secrets → Actions');
  console.log('2. Check that CRX_PRIVATE_KEY exists');
  console.log('3. The value should be the base64 string from key.pem.base64');
  console.log('\nTo update the secret with current key:');
  console.log(`${colors.yellow}base64 -w 0 key.pem > key.pem.base64${colors.reset} (Linux/Mac)`);
  console.log(`${colors.yellow}[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("key.pem")) | Out-File key.pem.base64${colors.reset} (Windows PowerShell)\n`);
}

// Main verification
console.log('🔐 Chrome Extension ID Verification Tool');
console.log('=========================================');
console.log(`Target Extension ID: ${colors.blue}${EXPECTED_ID}${colors.reset}`);

let allPassed = true;

// Run all verifications
const pemResult = verifyFromPEM();
if (pemResult === false) allPassed = false;

const pubResult = verifyFromPublic();
if (pubResult === false) allPassed = false;

const base64Result = verifyFromBase64();
if (base64Result === false) allPassed = false;

const metadataResult = verifyFromCRXMetadata();
if (metadataResult === false) allPassed = false;

// Summary
console.log('=========================================');
if (allPassed) {
  console.log(`${colors.green}✅ ALL VERIFICATIONS PASSED!${colors.reset}`);
  console.log(`${colors.green}Your key correctly generates Extension ID: ${EXPECTED_ID}${colors.reset}\n`);
  showGitHubSecretInstructions();
} else {
  console.log(`${colors.red}❌ VERIFICATION FAILED!${colors.reset}`);
  console.log(`${colors.red}The current key does NOT generate the expected Extension ID.${colors.reset}`);
  console.log('\nPossible issues:');
  console.log('1. Wrong key.pem file');
  console.log('2. Key was regenerated');
  console.log('3. Files are out of sync\n');
  console.log('To fix: Ensure you\'re using the original key.pem that generates ID: ' + EXPECTED_ID);
}

// Export for use in other scripts
export { generateExtensionId, EXPECTED_ID };