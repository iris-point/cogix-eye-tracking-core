#!/usr/bin/env node

/**
 * Prepare extension for release
 * - Generates icons
 * - Builds production version
 * - Creates ZIP and CRX files
 * - Updates version numbers
 * - Generates update manifest
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  log(`  → ${command}`, 'cyan');
  try {
    return execSync(command, { cwd: rootDir, stdio: 'inherit', ...options });
  } catch (error) {
    log(`  ✗ Command failed: ${command}`, 'yellow');
    throw error;
  }
}

async function main() {
  log('\n🚀 Preparing Cogix Eye Tracking Extension for Release\n', 'bright');
  
  // 1. Get version from package.json
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const version = packageJson.version;
  log(`📌 Version: ${version}\n`, 'green');
  
  // 2. Clean previous builds
  log('🧹 Cleaning previous builds...', 'yellow');
  if (fs.existsSync(path.join(rootDir, 'dist'))) {
    fs.rmSync(path.join(rootDir, 'dist'), { recursive: true, force: true });
  }
  
  // 3. Generate icons
  log('\n🎨 Generating icons...', 'yellow');
  exec('npm run generate-icons');
  exec('npm run generate-png');
  
  // 4. Build production version
  log('\n🔨 Building production version...', 'yellow');
  exec('npm run build:prod');
  
  // 5. Update manifest version
  log('\n📝 Updating manifest version...', 'yellow');
  const manifestPath = path.join(rootDir, 'dist', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = version;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  // 6. Create ZIP file
  log('\n📦 Creating ZIP package...', 'yellow');
  const zipName = `cogix-eye-tracking-extension-v${version}.zip`;
  
  // For Windows, use tar (available in Windows 10+)
  if (process.platform === 'win32') {
    exec(`cd dist && tar -a -c -f ../${zipName} *`);
  } else {
    exec(`cd dist && zip -r ../${zipName} .`);
  }
  
  // Also create a generic named version
  if (fs.existsSync(path.join(rootDir, 'cogix-eye-tracking-extension.zip'))) {
    fs.unlinkSync(path.join(rootDir, 'cogix-eye-tracking-extension.zip'));
  }
  fs.copyFileSync(
    path.join(rootDir, zipName),
    path.join(rootDir, 'cogix-eye-tracking-extension.zip')
  );
  
  // 7. Generate checksums
  log('\n🔐 Generating checksums...', 'yellow');
  const crypto = await import('crypto');
  const zipBuffer = fs.readFileSync(path.join(rootDir, zipName));
  const checksum = crypto.createHash('sha256').update(zipBuffer).digest('hex');
  
  const checksumContent = `SHA256 Checksums for v${version}:\n` +
    `${checksum}  ${zipName}\n` +
    `${checksum}  cogix-eye-tracking-extension.zip\n`;
  
  fs.writeFileSync(path.join(rootDir, 'checksums.txt'), checksumContent);
  
  // 8. Update the update manifest
  log('\n📋 Updating update manifest...', 'yellow');
  const updateManifest = fs.readFileSync(
    path.join(__dirname, 'update-manifest.xml'),
    'utf8'
  );
  
  const updatedManifest = updateManifest
    .replace('VERSION_PLACEHOLDER', version)
    .replace('EXTENSION_ID_PLACEHOLDER', 'YOUR_EXTENSION_ID_HERE'); // This would be computed from key
  
  fs.writeFileSync(
    path.join(rootDir, 'update.xml'),
    updatedManifest
  );
  
  // 9. Create release notes template
  log('\n📝 Creating release notes template...', 'yellow');
  const releaseNotes = `# Release v${version}

## 🎯 Cogix Eye Tracking Extension

### Installation

#### Quick Install (Windows)
\`\`\`powershell
iwr -Uri https://cogix.github.io/cogix-eye-tracking-core/install.ps1 -OutFile install.ps1; .\\install.ps1
\`\`\`

#### Quick Install (Mac/Linux)
\`\`\`bash
curl -L https://cogix.github.io/cogix-eye-tracking-core/install.sh | bash
\`\`\`

#### Manual Installation
1. Download \`cogix-eye-tracking-extension.zip\` from the assets below
2. Extract the ZIP file
3. Open Chrome and navigate to \`chrome://extensions/\`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the extracted folder

### What's New
- [Add your changes here]

### Bug Fixes
- [Add bug fixes here]

### Known Issues
- [Add known issues here]

### Checksums
\`\`\`
${checksum}  cogix-eye-tracking-extension.zip
\`\`\`
`;
  
  fs.writeFileSync(path.join(rootDir, 'RELEASE_NOTES.md'), releaseNotes);
  
  // 10. Summary
  log('\n✅ Release preparation complete!\n', 'green');
  log('📦 Files created:', 'bright');
  log(`  • ${zipName}`, 'blue');
  log(`  • cogix-eye-tracking-extension.zip`, 'blue');
  log(`  • checksums.txt`, 'blue');
  log(`  • update.xml`, 'blue');
  log(`  • RELEASE_NOTES.md`, 'blue');
  
  log('\n📋 Next steps:', 'bright');
  log('  1. Review and edit RELEASE_NOTES.md', 'yellow');
  log('  2. Commit all changes', 'yellow');
  log('  3. Create and push tag:', 'yellow');
  log(`     git tag v${version}`, 'cyan');
  log(`     git push origin v${version}`, 'cyan');
  log('  4. GitHub Actions will automatically create the release', 'yellow');
  
  log('\n🚀 Happy releasing!', 'green');
}

// Run the script
main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'yellow');
  process.exit(1);
});