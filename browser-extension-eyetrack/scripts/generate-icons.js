#!/usr/bin/env node

/**
 * Icon Generator for Chrome Extension
 * Procedurally generates icons in all required sizes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const iconsDir = path.join(rootDir, 'src', 'assets', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes required by Chrome
const ICON_SIZES = [16, 32, 48, 128];

/**
 * Generate SVG icon with eye tracking design
 */
function generateSVG(size) {
  const centerX = size / 2;
  const centerY = size / 2;
  const eyeRadius = size * 0.3;
  const pupilRadius = size * 0.12;
  const targetRadius = size * 0.4;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradient for depth -->
    <radialGradient id="bgGradient${size}">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </radialGradient>
    
    <!-- Eye gradient -->
    <radialGradient id="eyeGradient${size}">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="70%" style="stop-color:#f0f4ff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e0e7ff;stop-opacity:1" />
    </radialGradient>
    
    <!-- Pupil gradient -->
    <radialGradient id="pupilGradient${size}" cx="40%" cy="40%">
      <stop offset="0%" style="stop-color:#1e293b;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#334155;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
    </radialGradient>
    
    <!-- Target crosshair gradient -->
    <linearGradient id="targetGradient${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ec4899;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:0.8" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="${centerX}" cy="${centerY}" r="${size * 0.48}" fill="url(#bgGradient${size})" />
  
  <!-- Eye shape (ellipse for realistic look) -->
  <ellipse cx="${centerX}" cy="${centerY}" 
           rx="${eyeRadius * 1.3}" ry="${eyeRadius}" 
           fill="url(#eyeGradient${size})" 
           stroke="#667eea" stroke-width="${size * 0.02}" />
  
  <!-- Iris -->
  <circle cx="${centerX}" cy="${centerY}" r="${pupilRadius * 2}" 
          fill="#667eea" opacity="0.3" />
  
  <!-- Pupil with tracking dot -->
  <circle cx="${centerX + size * 0.05}" cy="${centerY - size * 0.03}" 
          r="${pupilRadius}" fill="url(#pupilGradient${size})" />
  
  <!-- Light reflection on pupil -->
  <ellipse cx="${centerX - size * 0.05}" cy="${centerY - size * 0.08}" 
           rx="${pupilRadius * 0.4}" ry="${pupilRadius * 0.3}" 
           fill="white" opacity="0.7" />
  
  <!-- Target crosshair overlay -->
  <g stroke="url(#targetGradient${size})" stroke-width="${size * 0.015}" fill="none" opacity="0.7">
    <!-- Horizontal line -->
    <line x1="${centerX - targetRadius}" y1="${centerY}" 
          x2="${centerX - eyeRadius * 0.5}" y2="${centerY}" />
    <line x1="${centerX + eyeRadius * 0.5}" y1="${centerY}" 
          x2="${centerX + targetRadius}" y2="${centerY}" />
    
    <!-- Vertical line -->
    <line x1="${centerX}" y1="${centerY - targetRadius}" 
          x2="${centerX}" y2="${centerY - eyeRadius * 0.5}" />
    <line x1="${centerX}" y1="${centerY + eyeRadius * 0.5}" 
          x2="${centerX}" y2="${centerY + targetRadius}" />
    
    <!-- Target circle -->
    <circle cx="${centerX}" cy="${centerY}" r="${targetRadius}" 
            stroke-dasharray="${size * 0.05} ${size * 0.02}" />
  </g>
  
  <!-- Recording indicator dot (red dot in corner) -->
  ${size >= 48 ? `
  <circle cx="${size * 0.8}" cy="${size * 0.2}" r="${size * 0.08}" 
          fill="#ef4444" stroke="white" stroke-width="${size * 0.02}">
    <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
  </circle>
  ` : ''}
</svg>`;
}

/**
 * Convert SVG to PNG using Canvas API
 * For Node.js, we'll create a simple HTML file that can be opened in browser
 */
function generateIconHTML() {
  const icons = ICON_SIZES.map(size => ({
    size,
    svg: generateSVG(size)
  }));
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Icon Generator</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 20px;
      background: #f0f4ff;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #667eea;
      text-align: center;
    }
    .icons-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 30px;
    }
    .icon-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .icon-preview {
      background: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      margin: 10px 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 150px;
    }
    .icon-preview img {
      image-rendering: crisp-edges;
    }
    .download-btn {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      margin: 5px;
    }
    .download-btn:hover {
      opacity: 0.9;
    }
    .download-all {
      background: #10b981;
      padding: 15px 30px;
      font-size: 16px;
      margin: 30px auto;
      display: block;
    }
    .instructions {
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .instructions h3 {
      margin-top: 0;
      color: #92400e;
    }
    canvas {
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 Cogix Eye Tracking Extension Icons</h1>
    
    <div class="instructions">
      <h3>How to save icons:</h3>
      <ol>
        <li>Click "Download PNG" for each icon size</li>
        <li>Save to: <code>src/assets/icons/</code></li>
        <li>Or use "Download All" to get a zip file</li>
      </ol>
    </div>
    
    <button class="download-btn download-all" onclick="downloadAll()">
      📦 Download All Icons as ZIP
    </button>
    
    <div class="icons-grid">
      ${icons.map(({ size, svg }) => `
        <div class="icon-card">
          <h3>Icon ${size}x${size}</h3>
          <div class="icon-preview">
            <div id="svg-${size}">${svg}</div>
          </div>
          <canvas id="canvas-${size}" width="${size}" height="${size}"></canvas>
          <button class="download-btn" onclick="downloadIcon(${size})">
            💾 Download PNG
          </button>
          <button class="download-btn" onclick="downloadSVG(${size})">
            📐 Download SVG
          </button>
        </div>
      `).join('')}
    </div>
  </div>
  
  <script>
    // Convert SVG to PNG
    function convertSVGtoPNG(size, callback) {
      const svgElement = document.querySelector(\`#svg-\${size} svg\`);
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.getElementById(\`canvas-\${size}\`);
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      img.onload = function() {
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        
        canvas.toBlob(function(blob) {
          callback(blob);
        }, 'image/png');
      };
      
      img.src = url;
    }
    
    // Download individual icon
    function downloadIcon(size) {
      convertSVGtoPNG(size, function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`icon-\${size}.png\`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
    
    // Download SVG version
    function downloadSVG(size) {
      const svgElement = document.querySelector(\`#svg-\${size} svg\`);
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`icon-\${size}.svg\`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    // Download all icons as ZIP (requires JSZip library)
    async function downloadAll() {
      // For simplicity, we'll download each one separately
      const sizes = [${ICON_SIZES.join(', ')}];
      
      for (const size of sizes) {
        await new Promise(resolve => {
          setTimeout(() => {
            downloadIcon(size);
            resolve();
          }, 500);
        });
      }
    }
    
    // Auto-generate PNGs on load
    window.addEventListener('load', () => {
      const sizes = [${ICON_SIZES.join(', ')}];
      sizes.forEach(size => {
        convertSVGtoPNG(size, () => {
          console.log(\`Generated icon-\${size}.png\`);
        });
      });
    });
  </script>
</body>
</html>`;
}

/**
 * Generate fallback PNG using pure Node.js
 * Creates a simple colored square with text
 */
function generateFallbackPNG(size) {
  // This creates a simple PPM file that can be converted to PNG
  // For a real implementation, you'd use a library like sharp or canvas
  console.log(`Generated placeholder for icon-${size}.png`);
}

// Main function
function generateIcons() {
  console.log('🎨 Generating Chrome Extension Icons...\n');
  
  // Generate SVG files
  ICON_SIZES.forEach(size => {
    const svgContent = generateSVG(size);
    const svgPath = path.join(iconsDir, `icon-${size}.svg`);
    fs.writeFileSync(svgPath, svgContent);
    console.log(`✓ Generated icon-${size}.svg`);
  });
  
  // Generate HTML file for PNG conversion
  const htmlContent = generateIconHTML();
  const htmlPath = path.join(rootDir, 'generate-icons.html');
  fs.writeFileSync(htmlPath, htmlContent);
  
  console.log('\n✅ SVG icons generated successfully!');
  console.log('\n📌 To generate PNG versions:');
  console.log(`   1. Open ${htmlPath} in Chrome`);
  console.log('   2. Click "Download PNG" for each icon');
  console.log('   3. Save to src/assets/icons/');
  console.log('\nAlternatively, the SVG files can be used directly in most modern contexts.');
}

// Run generator
generateIcons();