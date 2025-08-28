# Auto-Publishing Setup for @iris-point/eye-tracking-core

## 🚀 Auto-Publishing is Now Configured!

Starting from version **0.0.1**, the package will automatically publish to npm when you push to the main branch.

## Setup Requirements

### 1. Create NPM Token
1. Log in to [npmjs.com](https://www.npmjs.com)
2. Go to Account Settings → Access Tokens
3. Click "Generate New Token"
4. Choose "Automation" token type
5. Copy the token (starts with `npm_`)

### 2. Add Token to GitHub Repository
1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `NPM_TOKEN`
5. Value: Paste your npm token
6. Click "Add secret"

## How Auto-Publishing Works

### Automatic Version Bumping
The system automatically detects what type of version bump to apply based on commit messages:

| Commit Prefix | Version Bump | Example |
|---------------|--------------|---------|
| `feat:` or `feature:` | Minor (0.0.1 → 0.1.0) | `feat: add new calibration UI` |
| `fix:` | Patch (0.0.1 → 0.0.2) | `fix: resolve connection issue` |
| `breaking:` or `major:` | Major (0.0.1 → 1.0.0) | `breaking: change API structure` |
| `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:` | Patch | `docs: update README` |
| Any other | Patch (default) | `update core logic` |

### Triggering Auto-Publish

#### Method 1: Push to Main Branch (Automatic)
```bash
# Make your changes
git add .
git commit -m "feat: add new tracking feature"
git push origin main

# Auto-publish will:
# 1. Detect changes in src/
# 2. Bump version (0.0.1 → 0.1.0)
# 3. Build the package
# 4. Publish to npm
# 5. Create GitHub release
# 6. Update CDN automatically
```

#### Method 2: Manual Trigger (GitHub Actions)
1. Go to Actions tab in GitHub
2. Select "Publish to NPM" workflow
3. Click "Run workflow"
4. Choose release type: patch, minor, or major
5. Click "Run workflow"

#### Method 3: Local Release Commands
```bash
# Patch release (0.0.1 → 0.0.2)
npm run release:patch

# Minor release (0.0.1 → 0.1.0)
npm run release:minor

# Major release (0.0.1 → 1.0.0)
npm run release:major

# Or just (defaults to patch)
npm run release
```

## Version History Tracking

### Current Version
- **0.0.1** - Initial release

### View Published Versions
```bash
# Check npm registry
npm view @iris-point/eye-tracking-core versions

# Check local version
npm version
```

## CDN Links (Auto-Updated)

Once published, the package is automatically available at:

### Latest Version
```html
<!-- Always gets the latest version -->
<script src="https://unpkg.com/@iris-point/eye-tracking-core@latest/dist/cogix-eye-tracking-core.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@iris-point/eye-tracking-core@latest/dist/cogix-eye-tracking-core.min.js"></script>
```

### Specific Version
```html
<!-- Version 0.0.1 -->
<script src="https://unpkg.com/@iris-point/eye-tracking-core@0.0.1/dist/cogix-eye-tracking-core.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@iris-point/eye-tracking-core@0.0.1/dist/cogix-eye-tracking-core.min.js"></script>
```

## Workflow Features

✅ **Automatic version bumping** based on commit messages
✅ **Smart change detection** - only publishes when src/ files change
✅ **GitHub Release creation** with CDN links
✅ **Skip CI** - prevents infinite loops with `[skip ci]` in commit messages
✅ **Manual override** - trigger specific version bumps manually
✅ **CDN auto-update** - unpkg and jsDelivr update within minutes

## Best Practices

### Commit Message Convention
```bash
# Feature (minor bump)
git commit -m "feat: add heatmap visualization"

# Bug fix (patch bump)
git commit -m "fix: correct calibration point calculation"

# Breaking change (major bump)
git commit -m "breaking: redesign API structure"

# Documentation (patch bump)
git commit -m "docs: update installation guide"
```

### Skip Publishing
To push changes without triggering auto-publish:
```bash
git commit -m "chore: update config [skip ci]"
```

## Monitoring

### Check Workflow Status
1. Go to GitHub repository
2. Click on "Actions" tab
3. View "Publish to NPM" workflow runs

### Check NPM Package
- Package page: https://www.npmjs.com/package/@iris-point/eye-tracking-core
- Version badge: ![npm version](https://img.shields.io/npm/v/@iris-point/eye-tracking-core)
- Downloads: ![npm downloads](https://img.shields.io/npm/dm/@iris-point/eye-tracking-core)

## Troubleshooting

### Workflow Not Running
- Check if `NPM_TOKEN` secret is set in GitHub
- Ensure you're pushing to main/master branch
- Check if there are changes in src/ directory

### Publishing Failed
- Verify npm token is valid and not expired
- Check if organization has publishing permissions
- Ensure package name is available

### Version Not Bumping
- Check commit message format
- Verify .versionrc.json configuration
- Look at workflow logs in GitHub Actions

## Summary

Your package is now configured for **automatic publishing** with:
- 📦 Starting version: **0.0.1**
- 🤖 Auto-version bumping based on commits
- 🚀 Auto-publish on push to main
- 🌐 Instant CDN availability
- 📋 GitHub releases with changelog
- 🏷️ Git tags for each version

Just push your code and let the automation handle the rest! 🎉