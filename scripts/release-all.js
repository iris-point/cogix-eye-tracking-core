#!/usr/bin/env node

/**
 * Release script for Eye Tracking Core SDK
 * Handles npm package release
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

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
  log('\n🚀 Release for Cogix Eye Tracking Core SDK\n', 'bright');
  log('This will release the SDK npm package\n', 'yellow');
  
  // 1. Check current version
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  
  log('Current version:', 'cyan');
  log(`  SDK: ${packageJson.version}`);
  log('');
  
  // 2. Ask for version bump type
  const bumpType = await question('Version bump type (patch/minor/major) [patch]: ') || 'patch';
  
  if (!['patch', 'minor', 'major'].includes(bumpType)) {
    log('Invalid bump type. Use patch, minor, or major.', 'red');
    process.exit(1);
  }
  
  // 3. Calculate new version
  const versionParts = packageJson.version.split('.').map(Number);
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
  packageJson.version = newVersion;
  fs.writeFileSync(
    path.join(rootDir, 'package.json'),
    JSON.stringify(packageJson, null, 2) + '\n'
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
  const sdkTarball = `iris-point-eye-tracking-core-${newVersion}.tgz`;
  
  log('\n========================================', 'cyan');
  log('         Finalizing Release', 'bright');
  log('========================================\n', 'cyan');
  
  // 9. Generate checksums
  log('🔐 Generating checksums...', 'yellow');
  const crypto = await import('crypto');
  
  const sdkBuffer = fs.readFileSync(path.join(rootDir, sdkTarball));
  const sdkChecksum = crypto.createHash('sha256').update(sdkBuffer).digest('hex');
  
  const checksumContent = `SHA256 Checksums for v${newVersion}:\n\n` +
    `SDK Package:\n` +
    `${sdkChecksum}  ${sdkTarball}\n`;
  
  fs.writeFileSync(path.join(rootDir, 'checksums.txt'), checksumContent);
  
  // 10. Create release notes template
  log('\n📝 Creating release notes...', 'yellow');
  const releaseNotes = `# Release v${newVersion}

## 🎯 Cogix Eye Tracking Core SDK

### 📦 Installation
\`\`\`bash
npm install @iris-point/eye-tracking-core@${newVersion}
\`\`\`

### Key Features
- Hardware eye tracker support (via WebSocket)
- WebGazer webcam-based tracking
- React components and hooks
- Real-time analysis and visualization
- AOI detection and monitoring
- jsPsych plugin support

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
import { EyeTrackingSDK } from '@iris-point/eye-tracking-core';
\`\`\`

### Checksums
\`\`\`
${sdkChecksum}  ${sdkTarball}
\`\`\`
`;
  
  fs.writeFileSync(path.join(rootDir, 'RELEASE_NOTES.md'), releaseNotes);
  
  // 11. Summary
  log('\n✅ Release preparation complete!\n', 'green');
  
  log('📦 Package created:', 'bright');
  log(`  SDK Package:`, 'cyan');
  log(`    • ${sdkTarball}`, 'blue');
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
  log('     • Create GitHub Release with SDK package', 'blue');
  log('     • Publish SDK to NPM (if NPM_TOKEN is set)', 'blue');
  
  log('\n🚀 Release v' + newVersion + ' is ready!', 'green');
}

// Run the script
main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});