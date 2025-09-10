#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');
const isProduction = process.env.NODE_ENV === 'production';
const isWatch = process.argv.includes('--watch');

// Ensure dist directory exists
function ensureDistDir() {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // Create subdirectories
  const subdirs = ['background', 'content', 'popup', 'pages', 'lib', 'assets/icons'];
  subdirs.forEach(dir => {
    const fullPath = path.join(distDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
}

// Copy file with optional processing
function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠ File not found: ${src}`);
    return false;
  }
  
  let content = fs.readFileSync(src, 'utf8');
  
  // Process JavaScript files
  if (src.endsWith('.js')) {
    // Update paths for the new structure
    content = content
      .replace(/chrome\.runtime\.getURL\(['"]([^'"]+)['"]\)/g, (match, file) => {
        // Update paths to match new structure
        if (file === 'calibration.html') return `chrome.runtime.getURL('pages/calibration.html')`;
        if (file === 'offscreen.html') return `chrome.runtime.getURL('background/offscreen.html')`;
        if (file === 'eye-tracker-core.js') return `chrome.runtime.getURL('lib/eye-tracker-core.js')`;
        return match;
      });
    
    // In production, use production URLs
    if (isProduction) {
      content = content
        .replace(/http:\/\/localhost:8000/g, 'https://api.cogix.app')
        .replace(/http:\/\/localhost:8001/g, 'https://data-io.cogix.app')
        .replace(/http:\/\/localhost:3000/g, 'https://app.cogix.com');
    }
  }
  
  // Process HTML files
  if (src.endsWith('.html')) {
    // Update script and CSS paths
    content = content
      .replace(/src="([^"]+\.js)"/g, (match, file) => {
        const basename = path.basename(file);
        return `src="${basename}"`;
      })
      .replace(/href="([^"]+\.css)"/g, (match, file) => {
        const basename = path.basename(file);
        return `href="${basename}"`;
      });
  }
  
  fs.writeFileSync(dest, content);
  return true;
}

// Copy all files maintaining structure
function copyFiles() {
  const files = [
    // Background scripts
    ['src/background/background.js', 'background/background.js'],
    ['src/background/offscreen.js', 'background/offscreen.js'],
    ['src/background/offscreen.html', 'background/offscreen.html'],
    
    // Content scripts
    ['src/content/content.js', 'content/content.js'],
    
    // Popup files
    ['src/popup/popup.html', 'popup/popup.html'],
    ['src/popup/popup.css', 'popup/popup.css'],
    ['src/popup/popup.js', 'popup/popup.js'],
    
    // Pages
    ['src/pages/calibration.html', 'pages/calibration.html'],
    ['src/pages/calibration.js', 'pages/calibration.js'],
    
    // Libraries
    ['src/lib/dataio-client.js', 'lib/dataio-client.js'],
    ['src/lib/eye-tracker-core.js', 'lib/eye-tracker-core.js'],
  ];
  
  let successCount = 0;
  files.forEach(([src, dest]) => {
    const srcPath = path.join(rootDir, src);
    const destPath = path.join(distDir, dest);
    
    if (copyFile(srcPath, destPath)) {
      console.log(`✓ ${dest}`);
      successCount++;
    }
  });
  
  // Copy icons
  const iconsDir = path.join(srcDir, 'assets', 'icons');
  const destIconsDir = path.join(distDir, 'assets', 'icons');
  
  if (fs.existsSync(iconsDir)) {
    fs.readdirSync(iconsDir).forEach(file => {
      if (file.endsWith('.png') || file.endsWith('.svg')) {
        fs.copyFileSync(
          path.join(iconsDir, file),
          path.join(destIconsDir, file)
        );
      }
    });
    console.log('✓ Icons copied');
  }
  
  return successCount;
}

// Process manifest.json with updated paths
function processManifest() {
  const manifestPath = path.join(rootDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ manifest.json not found');
    return;
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Update paths for new structure
  manifest.background = {
    service_worker: 'background/background.js',
    type: 'module'
  };
  
  manifest.action = {
    default_popup: 'popup/popup.html',
    default_icon: {
      '16': 'assets/icons/icon-16.png',
      '48': 'assets/icons/icon-48.png',
      '128': 'assets/icons/icon-128.png'
    }
  };
  
  manifest.content_scripts = [
    {
      matches: ['<all_urls>'],
      js: ['content/content.js'],
      run_at: 'document_start'
    }
  ];
  
  manifest.web_accessible_resources = [
    {
      resources: ['lib/eye-tracker-core.js'],
      matches: ['<all_urls>'],
      use: 'fallback only - primary SDK loads from CDN'
    }
  ];
  
  manifest.icons = {
    '16': 'assets/icons/icon-16.png',
    '48': 'assets/icons/icon-48.png',
    '128': 'assets/icons/icon-128.png'
  };
  
  // In production, update version
  if (isProduction) {
    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    manifest.version = packageJson.version;
  }
  
  fs.writeFileSync(
    path.join(distDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  console.log('✓ manifest.json processed');
}

// Watch mode
function watch() {
  console.log('👀 Watching for changes...');
  
  const watchDirs = [srcDir, path.join(rootDir, 'manifest.json')];
  
  watchDirs.forEach(dir => {
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (filename) {
        console.log(`\n🔄 ${filename} changed, rebuilding...`);
        build();
      }
    });
  });
}

// Main build function
function build() {
  console.log(`\n🔨 Building Chrome Extension (${isProduction ? 'production' : 'development'})...\n`);
  
  ensureDistDir();
  
  const fileCount = copyFiles();
  processManifest();
  
  console.log(`\n✅ Build complete! ${fileCount} files copied to dist/`);
  console.log('📦 Load dist/ folder as unpacked extension in Chrome\n');
  
  if (!isWatch) {
    console.log('SDK will be loaded from CDN:');
    console.log('🌐 https://unpkg.com/@iris-point/eye-tracking-core@latest\n');
  }
}

// Run build
build();

if (isWatch) {
  watch();
}