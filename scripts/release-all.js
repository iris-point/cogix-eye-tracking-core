#!/usr/bin/env node

/**
 * Unified release script for Eye Tracking Core
 * Releases both the SDK npm package and Browser Extension
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const extensionDir = path.join(rootDir, 'browser-extension-eyetrack');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  log(`  → ${command}`, 'cyan');
  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    log(`  ✗ Command failed: ${command}`, 'red');
    throw error;
  }
}

function execReturn(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options }).trim();
  } catch (error) {
    return null;
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      resolve(answer);
    });
  });
}

async function main() {
  log('\n🚀 Unified Release for Cogix Eye Tracking Core\n', 'bright');
  log('This will release both the SDK package and Browser Extension\n', 'yellow');
  
  // 1. Check current versions
  const sdkPackageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const extPackageJson = JSON.parse(fs.readFileSync(path.join(extensionDir, 'package.json'), 'utf8'));
  
  log('Current versions:', 'cyan');
  log(`  SDK: ${sdkPackageJson.version}`);
  log(`  Extension: ${extPackageJson.version}`);
  log('');
  
  // 2. Ask for version bump type
  const bumpType = await question('Version bump type (patch/minor/major) [patch]: ') || 'patch';
  
  if (!['patch', 'minor', 'major'].includes(bumpType)) {
    log('Invalid bump type. Use patch, minor, or major.', 'red');
    process.exit(1);
  }
  
  // 3. Calculate new version
  const versionParts = sdkPackageJson.version.split('.').map(Number);
  if (bumpType === 'patch') versionParts[2]++;
  else if (bumpType === 'minor') { versionParts[1]++; versionParts[2] = 0; }
  else if (bumpType === 'major') { versionParts[0]++; versionParts[1] = 0; versionParts[2] = 0; }
  
  const newVersion = versionParts.join('.');
  log(`\n📌 New version will be: ${newVersion}\n`, 'green');
  
  // 4. Confirm release
  const confirm = await question(`Proceed with release v${newVersion}? (y/n) [y]: `) || 'y';
  if (confirm.toLowerCase() !== 'y') {
    log('Release cancelled.', 'yellow');
    process.exit(0);
  }
  
  rl.close();
  
  log('\n========================================', 'cyan');
  log('          Building SDK Package', 'bright');
  log('========================================\n', 'cyan');
  
  // 5. Update SDK version
  log('📝 Updating SDK version...', 'yellow');
  sdkPackageJson.version = newVersion;
  fs.writeFileSync(
    path.join(rootDir, 'package.json'),
    JSON.stringify(sdkPackageJson, null, 2) + '\n'
  );
  
  // 6. Build SDK
  log('\n🔨 Building SDK...', 'yellow');
  exec('npm run build', { cwd: rootDir });
  
  // 7. Validate SDK
  log('\n✅ Validating SDK...', 'yellow');
  exec('npm run validate', { cwd: rootDir });
  
  // 8. Pack SDK
  log('\n📦 Packing SDK...', 'yellow');
  exec('npm pack', { cwd: rootDir });
  const sdkTarball = `iris-point-eye-tracking-${newVersion}.tgz`;
  
  log('\n========================================', 'cyan');
  log('       Building Browser Extension', 'bright');
  log('========================================\n', 'cyan');
  
  // 9. Update Extension version
  log('📝 Updating Extension version...', 'yellow');
  extPackageJson.version = newVersion;
  fs.writeFileSync(
    path.join(extensionDir, 'package.json'),
    JSON.stringify(extPackageJson, null, 2) + '\n'
  );
  
  // 10. Clean extension build
  log('\n🧹 Cleaning previous extension build...', 'yellow');
  if (fs.existsSync(path.join(extensionDir, 'dist'))) {
    fs.rmSync(path.join(extensionDir, 'dist'), { recursive: true, force: true });
  }
  
  // 11. Generate icons
  log('\n🎨 Generating extension icons...', 'yellow');
  exec('npm run generate-icons', { cwd: extensionDir });
  exec('node scripts/svg-to-png.js', { cwd: extensionDir });
  
  // 12. Build extension
  log('\n🔨 Building extension...', 'yellow');
  const env = { ...process.env, NODE_ENV: 'production' };
  exec('npm run build', { cwd: extensionDir, env });
  
  // 13. Update manifest version
  log('\n📝 Updating manifest version...', 'yellow');
  const manifestPath = path.join(extensionDir, 'dist', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = newVersion;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  // 14. Create extension ZIP
  log('\n📦 Creating extension ZIP...', 'yellow');
  const zipName = `cogix-eye-tracking-extension-v${newVersion}.zip`;
  
  if (process.platform === 'win32') {
    exec(`cd dist && tar -a -c -f ../${zipName} *`, { cwd: extensionDir });
  } else {
    exec(`cd dist && zip -r ../${zipName} .`, { cwd: extensionDir });
  }
  
  // Copy to generic name
  fs.copyFileSync(
    path.join(extensionDir, zipName),
    path.join(extensionDir, 'cogix-eye-tracking-extension.zip')
  );
  
  log('\n========================================', 'cyan');
  log('         Finalizing Release', 'bright');
  log('========================================\n', 'cyan');
  
  // 15. Generate checksums
  log('🔐 Generating checksums...', 'yellow');
  const crypto = await import('crypto');
  
  const sdkBuffer = fs.readFileSync(path.join(rootDir, sdkTarball));
  const sdkChecksum = crypto.createHash('sha256').update(sdkBuffer).digest('hex');
  
  const zipBuffer = fs.readFileSync(path.join(extensionDir, zipName));
  const zipChecksum = crypto.createHash('sha256').update(zipBuffer).digest('hex');
  
  const checksumContent = `SHA256 Checksums for v${newVersion}:\n\n` +
    `SDK Package:\n` +
    `${sdkChecksum}  ${sdkTarball}\n\n` +
    `Browser Extension:\n` +
    `${zipChecksum}  ${zipName}\n` +
    `${zipChecksum}  cogix-eye-tracking-extension.zip\n`;
  
  fs.writeFileSync(path.join(rootDir, 'checksums.txt'), checksumContent);
  
  // 16. Create release notes template
  log('\n📝 Creating release notes...', 'yellow');
  const releaseNotes = `# Release v${newVersion}

## 🎯 Cogix Eye Tracking Core

This release includes both the Eye Tracking SDK and Browser Extension.

### 📦 Eye Tracking SDK

#### Installation
\`\`\`bash
npm install @iris-point/eye-tracking@${newVersion}
\`\`\`

#### Key Features
- Hardware eye tracker support (via WebSocket)
- WebGazer webcam-based tracking
- React components and hooks
- Real-time analysis and visualization
- AOI detection and monitoring

### 🌐 Browser Extension

#### Installation
1. Download \`cogix-eye-tracking-extension-v${newVersion}.zip\`
2. Extract the ZIP file
3. Open Chrome → \`chrome://extensions/\`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the extracted folder

#### Features
- Screen recording with eye tracking overlay
- Fullscreen calibration
- Cogix platform integration
- Automatic data submission

### ✨ What's New
- [Add new features here]

### 🐛 Bug Fixes
- [Add bug fixes here]

### 💔 Breaking Changes
- [Add breaking changes here]

### 📊 Migration Guide
If upgrading from a previous version:
\`\`\`javascript
// Update your imports if needed
import { EyeTrackingSDK } from '@iris-point/eye-tracking';
\`\`\`

### Checksums
\`\`\`
${sdkChecksum}  ${sdkTarball}
${zipChecksum}  ${zipName}
\`\`\`
`;
  
  fs.writeFileSync(path.join(rootDir, 'RELEASE_NOTES.md'), releaseNotes);
  
  // 17. Summary
  log('\n✅ Release preparation complete!\n', 'green');
  
  log('📦 Packages created:', 'bright');
  log(`  SDK Package:`, 'cyan');
  log(`    • ${sdkTarball}`, 'blue');
  log(`  Browser Extension:`, 'cyan');
  log(`    • ${zipName}`, 'blue');
  log(`    • cogix-eye-tracking-extension.zip`, 'blue');
  log(`  Documentation:`, 'cyan');
  log(`    • checksums.txt`, 'blue');
  log(`    • RELEASE_NOTES.md`, 'blue');
  
  log('\n📋 Next steps:', 'bright');
  log('  1. Review and edit RELEASE_NOTES.md', 'yellow');
  log('  2. Commit all changes:', 'yellow');
  log(`     git add .`, 'cyan');
  log(`     git commit -m "Release v${newVersion}"`, 'cyan');
  log('  3. Create and push tag:', 'yellow');
  log(`     git tag v${newVersion}`, 'cyan');
  log(`     git push origin main --tags`, 'cyan');
  log('  4. GitHub Actions will automatically:', 'yellow');
  log('     • Create GitHub Release with both packages', 'blue');
  log('     • Publish SDK to NPM (if NPM_TOKEN is set)', 'blue');
  log('     • Deploy extension to GitHub Pages', 'blue');
  
  log('\n🚀 Release v' + newVersion + ' is ready!', 'green');
}

// Run the script
main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});