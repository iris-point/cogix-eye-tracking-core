#!/usr/bin/env node

/**
 * Automated release script for CI/CD environments
 * Usage: node scripts/release-ci.js [patch|minor|major|auto]
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Get version type from command line or environment
const versionType = process.argv[2] || process.env.RELEASE_TYPE || 'auto';

// Colors for output (work in CI environments)
const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`)
};

function exec(command) {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  return packageJson.version;
}

function detectVersionType() {
  // Get the last commit message
  const lastCommit = exec('git log -1 --pretty=%B');
  
  // Detect version type from commit message
  if (lastCommit.match(/^(breaking|major):/i)) {
    return 'major';
  } else if (lastCommit.match(/^(feat|feature):/i)) {
    return 'minor';
  } else if (lastCommit.match(/^(fix|docs|style|refactor|perf|test|chore|build|ci):/i)) {
    return 'patch';
  }
  
  // Default to patch
  return 'patch';
}

async function release() {
  console.log('🚀 Automated Release Process Started\n');
  
  const currentVersion = getCurrentVersion();
  log.info(`Current version: ${currentVersion}`);
  
  // Determine version type
  let finalVersionType = versionType;
  if (versionType === 'auto') {
    finalVersionType = detectVersionType();
    log.info(`Auto-detected version type: ${finalVersionType}`);
  } else {
    log.info(`Using specified version type: ${finalVersionType}`);
  }
  
  try {
    // Configure git
    exec('git config --global user.email "github-actions[bot]@users.noreply.github.com"');
    exec('git config --global user.name "github-actions[bot]"');
    
    // Build the package
    log.info('Building package...');
    exec('npm run build');
    log.success('Build successful');
    
    // Update version
    log.info(`Bumping ${finalVersionType} version...`);
    exec(`npm version ${finalVersionType} -m "chore(release): %s [skip ci]"`);
    const newVersion = getCurrentVersion();
    log.success(`Version bumped to ${newVersion}`);
    
    // Get NPM token from environment
    if (!process.env.NODE_AUTH_TOKEN && !process.env.NPM_TOKEN) {
      log.warning('No NPM token found in environment, skipping publish');
      return;
    }
    
    // Publish to npm
    log.info('Publishing to npm...');
    exec('npm publish --access public');
    log.success('Published to npm successfully');
    
    // Push changes back to repository
    log.info('Pushing changes to repository...');
    exec('git push --follow-tags');
    log.success('Changes pushed successfully');
    
    // Summary
    console.log('\n📦 Release Summary:');
    console.log(`  Version: ${newVersion}`);
    console.log(`  NPM: https://www.npmjs.com/package/@iris-point/eye-tracking-core`);
    console.log(`  unpkg: https://unpkg.com/@iris-point/eye-tracking-core@${newVersion}/`);
    console.log(`  jsDelivr: https://cdn.jsdelivr.net/npm/@iris-point/eye-tracking-core@${newVersion}/`);
    
    process.exit(0);
  } catch (error) {
    log.error('Release failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run release
release();