# 🚀 Release Guide - Eye Tracking Core SDK

This repository contains the **Eye Tracking Core SDK** for developers.

**Eye Tracking SDK** (`@iris-point/eye-tracking-core`) - NPM package for developers

## 📦 Package Structure

```
cogix-eye-tracking-core/
├── src/                    # SDK source code
├── dist/                   # SDK build output
├── examples/               # Example implementations
├── jspsych-plugin/         # jsPsych plugin files
├── jspsych-extension/      # jsPsych extension files
└── scripts/               # Release automation
```

## 🎯 Release Process

### Quick Release (Recommended)

Use the release script to build and prepare the SDK package:

```bash
# From root directory
node scripts/release-all.js

# This will:
# 1. Prompt for version bump type (patch/minor/major)
# 2. Build and validate SDK
# 3. Create release package
# 4. Generate checksums
# 5. Prepare release notes
```

### Manual Release Steps

If you need more control:

```bash
# 1. Update version manually
npm version patch  # or minor/major

# 2. Build SDK
npm run build
npm run validate

# 3. Create package
npm pack

# 4. Create and push tag
git add .
git commit -m "Release v1.0.5"
git tag v1.0.5
git push origin main --tags
```

## 🤖 Automated GitHub Actions

When you push a version tag (`v*`), GitHub Actions automatically:

1. **Builds SDK package**
   - Validates TypeScript
   - Creates npm package (.tgz)

2. **Creates GitHub Release**
   - Uploads SDK package
   - Generates release notes
   - Provides installation instructions

3. **Publishes to NPM** (if NPM_TOKEN is set)
   - Publishes `@iris-point/eye-tracking-core`

## 📊 Release Artifacts

Each release includes:

### SDK Package
- **NPM**: `@iris-point/eye-tracking-core@VERSION`
- **File**: `iris-point-eye-tracking-core-VERSION.tgz`
- **Install**: `npm install @iris-point/eye-tracking-core@VERSION`

### Documentation
- `checksums.txt` - SHA256 verification
- `RELEASE_NOTES.md` - Version changelog

## 🌐 Distribution Channels

### 1. NPM Registry
```bash
npm install @iris-point/eye-tracking-core
# or specific version
npm install @iris-point/eye-tracking-core@1.0.5
```

### 2. GitHub Releases
- Latest: https://github.com/iris-point/cogix-eye-tracking-core/releases/latest
- All releases: https://github.com/iris-point/cogix-eye-tracking-core/releases

### 3. CDN Access

#### Via unpkg
```html
<script src="https://unpkg.com/@iris-point/eye-tracking-core@latest"></script>
```

#### Via jsDelivr
```html
<script src="https://cdn.jsdelivr.net/npm/@iris-point/eye-tracking-core@latest"></script>
```

## 🔧 Version Management

### Semantic Versioning
- **Major** (X.0.0): Breaking changes
- **Minor** (1.X.0): New features (backward compatible)
- **Patch** (1.0.X): Bug fixes

### Version Commands
```bash
# Automated version bump
npm run release:patch   # 1.0.0 → 1.0.1
npm run release:minor   # 1.0.0 → 1.1.0
npm run release:major   # 1.0.0 → 2.0.0

# Manual version
npm version 1.2.3 --no-git-tag-version
```

## 📋 Release Checklist

### Pre-Release
- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Examples tested

### SDK
- [ ] Version bumped in package.json
- [ ] Build successful (`npm run build`)
- [ ] TypeScript validation (`npm run validate`)
- [ ] Package created (`npm pack`)
- [ ] Local testing successful
- [ ] React components work
- [ ] WebSocket connection works
- [ ] WebGazer integration works
- [ ] jsPsych plugins work

### Post-Release
- [ ] GitHub Release created
- [ ] NPM package published
- [ ] Documentation updated
- [ ] Dependent projects notified

## 🆘 Troubleshooting

### Build Issues
```bash
# Clean and rebuild
rm -rf dist node_modules package-lock.json
npm install
npm run build
```

### NPM Publishing Issues
```bash
# Check npm login
npm whoami

# Verify package before publishing
npm pack --dry-run

# Manual publish with debug
npm publish --access public --verbose
```

### Version Conflicts
```bash
# Reset to git tag version
npm version $(git describe --tags --abbrev=0) --no-git-tag-version --allow-same-version
```

## 🔄 Rollback Process

If a release has issues:

### NPM Package
```bash
# Deprecate bad version
npm deprecate @iris-point/eye-tracking-core@1.2.3 "Contains critical bug"

# Publish patch
npm version patch
npm publish
```

### Git Tags
```bash
# Delete local tag
git tag -d v1.2.3

# Delete remote tag
git push origin :refs/tags/v1.2.3
```

## 🎯 Complete Release Example

```bash
# 1. Start release process
node scripts/release-all.js
# Choose: patch/minor/major
# Confirm version

# 2. Script automatically:
# - Updates version
# - Builds SDK
# - Creates package
# - Generates checksums

# 3. Review and edit RELEASE_NOTES.md

# 4. Commit and tag
git add .
git commit -m "Release v1.2.3"
git tag v1.2.3

# 5. Push to GitHub
git push origin main --tags

# 6. GitHub Actions will:
# - Create release
# - Publish to NPM
# - Upload assets
```

## 📚 Additional Resources

- [NPM Package](https://www.npmjs.com/package/@iris-point/eye-tracking-core)
- [GitHub Repository](https://github.com/iris-point/cogix-eye-tracking-core)
- [API Documentation](https://github.com/iris-point/cogix-eye-tracking-core#readme)
- [Examples](https://github.com/iris-point/cogix-eye-tracking-core/tree/main/examples)