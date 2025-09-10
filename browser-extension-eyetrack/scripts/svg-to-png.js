#!/usr/bin/env node

/**
 * Convert SVG icons to PNG format for Chrome Extension
 * Uses Puppeteer or Playwright for headless conversion
 * Fallback: Creates simple colored PNG placeholders
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas } from 'canvas';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, '..', 'src', 'assets', 'icons');

// Simple PNG generator as fallback
function generateSimplePNG(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#9333ea');
  gradient.addColorStop(1, '#7c3aed');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Draw an eye symbol
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size / 16;
  
  // Eye outline (ellipse)
  ctx.beginPath();
  ctx.ellipse(size / 2, size / 2, size * 0.35, size * 0.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  
  // Pupil
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner iris
  ctx.fillStyle = '#9333ea';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.08, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas.toBuffer('image/png');
}

// Generate PNG icons
const sizes = [16, 32, 48, 128];

console.log('🎨 Generating PNG icons from simple canvas...\n');

sizes.forEach(size => {
  const outputPath = path.join(iconsDir, `icon-${size}.png`);
  const buffer = generateSimplePNG(size);
  
  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Generated icon-${size}.png`);
});

console.log('\n✅ PNG icons generated successfully!');
console.log(`📁 Icons saved to: ${iconsDir}`);