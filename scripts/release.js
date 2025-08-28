#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`)
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Execute command and return output
function exec(command, silent = false) {
  try {
    const output = execSync(command, { encoding: 'utf-8' });
    if (!silent) {
      return output.trim();
    }
    return output;
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

// Check if there are uncommitted changes
function hasUncommittedChanges() {
  try {
    const status = exec('git status --porcelain', true);
    return status.length > 0;
  } catch {
    return false;
  }
}

// Get current version from package.json
function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  return packageJson.version;
}

// Check if on main/master branch
function getCurrentBranch() {
  return exec('git rev-parse --abbrev-ref HEAD', true);
}

// Check if npm token is configured in GitHub
async function checkNpmToken() {
  log.info('Checking NPM configuration...');
  
  try {
    const whoami = exec('npm whoami', true);
    log.success(`Logged in as: ${whoami}`);
    return true;
  } catch {
    log.warning('Not logged in to npm locally (GitHub Actions will handle publishing)');
    return true; // Don't block, as GitHub Actions has the token
  }
}

// Main release process
async function release() {
  log.title('🚀 @iris-point/eye-tracking-core Release Script');
  
  const currentVersion = getCurrentVersion();
  log.info(`Current version: ${colors.bright}${currentVersion}${colors.reset}`);

  // Pre-flight checks
  log.title('📋 Pre-flight Checks');

  // Check git status
  if (hasUncommittedChanges()) {
    log.error('You have uncommitted changes!');
    const proceed = await question('Do you want to commit them first? (y/n): ');
    
    if (proceed.toLowerCase() === 'y') {
      const message = await question('Enter commit message: ');
      exec(`git add .`);
      exec(`git commit -m "${message}"`);
      log.success('Changes committed');
    } else {
      log.error('Please commit or stash your changes before releasing');
      process.exit(1);
    }
  } else {
    log.success('Working directory clean');
  }

  // Check branch
  const branch = getCurrentBranch();
  if (branch !== 'main' && branch !== 'master') {
    log.warning(`You're on branch "${branch}" (usually releases are from main/master)`);
    const proceed = await question('Continue anyway? (y/n): ');
    if (proceed.toLowerCase() !== 'y') {
      process.exit(0);
    }
  } else {
    log.success(`On ${branch} branch`);
  }

  // Check npm token
  await checkNpmToken();

  // Build test
  log.title('🔨 Testing Build');
  try {
    log.info('Running build...');
    exec('npm run build', true);
    log.success('Build successful');
  } catch (error) {
    log.error('Build failed! Please fix build errors before releasing.');
    console.error(error.message);
    process.exit(1);
  }

  // Select version type
  log.title('📦 Version Selection');
  
  console.log(`
Choose version type:
  ${colors.bright}1)${colors.reset} Patch (${currentVersion} → ${getNextVersion(currentVersion, 'patch')}) - Bug fixes, small changes
  ${colors.bright}2)${colors.reset} Minor (${currentVersion} → ${getNextVersion(currentVersion, 'minor')}) - New features, backwards compatible
  ${colors.bright}3)${colors.reset} Major (${currentVersion} → ${getNextVersion(currentVersion, 'major')}) - Breaking changes
  ${colors.bright}4)${colors.reset} Pre-release (alpha/beta)
  ${colors.bright}5)${colors.reset} Custom version
  ${colors.bright}0)${colors.reset} Cancel
  `);

  const choice = await question('Select option (1-5, 0 to cancel): ');

  let versionType = '';
  let customVersion = '';

  switch (choice) {
    case '1':
      versionType = 'patch';
      break;
    case '2':
      versionType = 'minor';
      break;
    case '3':
      versionType = 'major';
      break;
    case '4':
      const prerelease = await question('Enter pre-release type (alpha/beta): ');
      versionType = `prerelease --preid=${prerelease}`;
      break;
    case '5':
      customVersion = await question('Enter custom version (e.g., 1.2.3): ');
      if (!customVersion.match(/^\d+\.\d+\.\d+(-\w+\.\d+)?$/)) {
        log.error('Invalid version format');
        process.exit(1);
      }
      break;
    case '0':
      log.info('Release cancelled');
      process.exit(0);
    default:
      log.error('Invalid option');
      process.exit(1);
  }

  // Show what will happen
  const newVersion = customVersion || getNextVersion(currentVersion, versionType.split(' ')[0]);
  
  log.title('📝 Release Summary');
  console.log(`
  Current version: ${colors.yellow}${currentVersion}${colors.reset}
  New version:     ${colors.green}${newVersion}${colors.reset}
  Branch:          ${branch}
  
  This will:
  1. Update package.json and package-lock.json
  2. Create git commit and tag v${newVersion}
  3. Push to GitHub
  4. Trigger GitHub Actions to publish to npm
  5. Create GitHub release
  6. Update CDN (unpkg, jsDelivr)
  `);

  const confirm = await question(`${colors.bright}Proceed with release? (yes/no): ${colors.reset}`);
  
  if (confirm.toLowerCase() !== 'yes') {
    log.warning('Release cancelled');
    process.exit(0);
  }

  // Execute release
  log.title('🚀 Executing Release');

  try {
    // Update version
    log.info('Updating version...');
    if (customVersion) {
      exec(`npm version ${customVersion} -m "chore(release): %s"`);
    } else {
      exec(`npm version ${versionType} -m "chore(release): %s"`);
    }
    log.success(`Version updated to ${newVersion}`);

    // Push to GitHub
    log.info('Pushing to GitHub...');
    exec('git push --follow-tags');
    log.success('Pushed to GitHub with tags');

    // Success!
    log.title(`🎉 Release ${newVersion} Initiated Successfully!`);
    
    console.log(`
${colors.green}Next steps (automatic via GitHub Actions):${colors.reset}
  • Building package
  • Publishing to npm registry
  • Creating GitHub release
  • Updating CDN links

${colors.cyan}Monitor progress:${colors.reset}
  • GitHub Actions: https://github.com/[your-repo]/actions
  • NPM Package: https://www.npmjs.com/package/@iris-point/eye-tracking-core

${colors.cyan}CDN Links (available in ~2 minutes):${colors.reset}
  • https://unpkg.com/@iris-point/eye-tracking-core@${newVersion}/
  • https://cdn.jsdelivr.net/npm/@iris-point/eye-tracking-core@${newVersion}/
    `);

  } catch (error) {
    log.error('Release failed!');
    console.error(error.message);
    process.exit(1);
  }

  rl.close();
}

// Helper to calculate next version
function getNextVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'prerelease':
      return `${major}.${minor}.${patch + 1}-alpha.0`;
    default:
      return current;
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  log.error('Unexpected error:');
  console.error(error);
  process.exit(1);
});

// Ctrl+C handler
process.on('SIGINT', () => {
  console.log('\n');
  log.warning('Release cancelled by user');
  process.exit(0);
});

// Run the release
release().catch((error) => {
  log.error('Release failed:');
  console.error(error);
  process.exit(1);
});