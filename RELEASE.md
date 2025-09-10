# 🚀 Release Guide - Eye Tracking Core

This repository contains **two main packages** that are released together:

1. **Eye Tracking SDK** (`@iris-point/eye-tracking`) - NPM package for developers
2. **Browser Extension** (`cogix-eye-tracking-extension`) - Chrome extension for end users

## 📦 Package Structure

```
cogix-eye-tracking-core/
├── src/                    # SDK source code
├── dist/                   # SDK build output
├── browser-extension-eyetrack/   # Browser extension
│   ├── src/               # Extension source
│   └── dist/              # Extension build output
└── scripts/               # Release automation
```

## 🎯 Unified Release Process

### Quick Release (Recommended)

Use the unified release script to release both packages with the same version:

```bash
# From root directory
npm run release:all

# This will:
# 1. Prompt for version bump type (patch/minor/major)
# 2. Build and validate SDK
# 3. Build browser extension
# 4. Create release packages
# 5. Generate checksums
# 6. Prepare release notes
```

### Manual Release Steps

If you need more control:

```bash
# 1. Update versions manually
npm version patch  # or minor/major

# 2. Build SDK
npm run build
npm run validate

# 3. Build Extension
cd browser-extension-eyetrack
npm run prepare-release

# 4. Create and push tag
git add .
git commit -m "Release v1.0.5"
git tag v1.0.5
git push origin main --tags
```

## 🤖 Automated GitHub Actions

When you push a version tag (`v*`), GitHub Actions automatically:

1. **Builds both packages**
   - SDK npm package (.tgz)
   - Browser extension (.zip)

2. **Creates GitHub Release**
   - Uploads SDK package
   - Uploads extension ZIP
   - Generates release notes
   - Provides installation instructions

3. **Publishes to NPM** (if NPM_TOKEN is set)
   - Publishes `@iris-point/eye-tracking`

4. **Deploys to GitHub Pages**
   - Hosts extension download page
   - Provides installation scripts

## 📊 Release Artifacts

Each release includes:

### SDK Package
- **NPM**: `@iris-point/eye-tracking@VERSION`
- **File**: `eye-tracking-sdk-vVERSION.tgz`
- **Install**: `npm install @iris-point/eye-tracking@VERSION`

### Browser Extension
- **ZIP**: `cogix-eye-tracking-extension-vVERSION.zip`
- **Latest**: `cogix-eye-tracking-extension.zip`
- **Install**: Manual Chrome installation or automated scripts

### Documentation
- `checksums.txt` - SHA256 verification
- `RELEASE_NOTES.md` - Version changelog

## 🌐 Distribution Channels

### 1. NPM Registry (SDK)
```bash
npm install @iris-point/eye-tracking
# or specific version
npm install @iris-point/eye-tracking@1.0.5
```

### 2. GitHub Releases (Both)
- Latest: https://github.com/cogix/cogix-eye-tracking-core/releases/latest
- All releases: https://github.com/cogix/cogix-eye-tracking-core/releases

### 3. GitHub Pages (Extension)
- Landing page: https://cogix.github.io/cogix-eye-tracking-core/
- Direct download: https://cogix.github.io/cogix-eye-tracking-core/cogix-eye-tracking-extension.zip

### 4. CDN Access

#### SDK via unpkg
```html
<script src="https://unpkg.com/@iris-point/eye-tracking@latest"></script>
```

#### SDK via jsDelivr
```html
<script src="https://cdn.jsdelivr.net/npm/@iris-point/eye-tracking@latest"></script>
```

#### Extension via GitHub
```bash
# Latest extension
curl -L https://github.com/cogix/cogix-eye-tracking-core/releases/latest/download/cogix-eye-tracking-extension.zip
```

## 🔧 Version Management

### Semantic Versioning
Both packages use synchronized versions:
- **Major** (X.0.0): Breaking changes
- **Minor** (1.X.0): New features
- **Patch** (1.0.X): Bug fixes

### Version Bump Commands
```bash
# Patch release (1.0.0 -> 1.0.1)
npm run release:patch

# Minor release (1.0.0 -> 1.1.0)
npm run release:minor

# Major release (1.0.0 -> 2.0.0)
npm run release:major

# Pre-release versions
npm run release:alpha  # 1.0.0-alpha.0
npm run release:beta   # 1.0.0-beta.0
```

## 📝 Release Checklist

Before releasing:

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Browser extension tested in Chrome
- [ ] SDK examples work correctly
- [ ] Version numbers synchronized

During release:

- [ ] Run `npm run release:all`
- [ ] Review generated release notes
- [ ] Edit RELEASE_NOTES.md with actual changes
- [ ] Commit all changes
- [ ] Push tag to trigger GitHub Actions

After release:

- [ ] Verify GitHub Release created
- [ ] Check NPM package published
- [ ] Test extension download from GitHub Pages
- [ ] Announce release if needed

## 🔐 Security & Keys

### NPM Publishing
Set `NPM_TOKEN` in GitHub Secrets for automated publishing:
1. Go to npmjs.com → Account Settings → Access Tokens
2. Generate automation token
3. Add to GitHub repo: Settings → Secrets → New repository secret
4. Name: `NPM_TOKEN`, Value: your token

### Extension Signing
For CRX generation (optional):
```bash
# Generate key pair
openssl genrsa -out key.pem 2048
openssl rsa -in key.pem -pubout -out key.pub

# Keep key.pem private!
```

## 🚨 Troubleshooting

### Build Failures
```bash
# Clean and rebuild
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Version Mismatch
```bash
# Sync versions manually
cd browser-extension-eyetrack
npm version 1.0.5 --no-git-tag-version
cd ..
npm version 1.0.5 --no-git-tag-version
```

### Failed GitHub Actions
- Check Actions tab for error logs
- Ensure NPM_TOKEN is set correctly
- Verify tag format is `v*` (e.g., v1.0.5)

## 📊 Usage Analytics

Track adoption:
- **NPM**: https://www.npmjs.com/package/@iris-point/eye-tracking
- **GitHub**: Insights → Traffic → Popular content
- **Extension**: GitHub Release download counts

## 🔄 Rollback Procedure

If issues are found after release:

1. **NPM Package**:
   ```bash
   npm deprecate @iris-point/eye-tracking@VERSION "Critical bug found"
   npm publish --tag previous  # Publish previous version as latest
   ```

2. **Browser Extension**:
   - Delete problematic release from GitHub
   - Re-run previous release workflow
   - Update GitHub Pages with previous version

3. **Hotfix**:
   ```bash
   git checkout -b hotfix/v1.0.6
   # Fix issues
   npm run release:all  # Choose patch
   ```

## 📚 Additional Resources

- [NPM Publishing Docs](https://docs.npmjs.com/cli/v8/commands/npm-publish)
- [Chrome Extension Distribution](https://developer.chrome.com/docs/extensions/mv3/hosting/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
- [Semantic Versioning](https://semver.org/)

## 🤝 Release Responsibilities

- **SDK Changes**: Core eye tracking functionality
- **Extension Changes**: Browser integration, UI
- **Both**: Version bumps, release notes, testing

Remember: Both packages are released together to ensure compatibility!