# Release Scripts

## 🎯 Interactive Release Script (`release.js`)

**For developers** - Interactive CLI with prompts and validation.

### Usage:
```bash
npm run release
```

### Features:
- ✅ Pre-flight checks (git status, branch, build)
- ✅ Interactive version selection
- ✅ Shows exactly what will happen
- ✅ Confirmation before release
- ✅ Colorful terminal output
- ✅ Handles uncommitted changes
- ✅ Validates everything before pushing

### Screenshot:
```
🚀 @iris-point/eye-tracking-core Release Script

📋 Pre-flight Checks
✓ Working directory clean
✓ On main branch
✓ Build successful

📦 Version Selection
Current version: 0.0.1

Choose version type:
  1) Patch (0.0.1 → 0.0.2) - Bug fixes, small changes
  2) Minor (0.0.1 → 0.1.0) - New features, backwards compatible
  3) Major (0.0.1 → 1.0.0) - Breaking changes
  4) Pre-release (alpha/beta)
  5) Custom version
  0) Cancel

Select option (1-5, 0 to cancel): _
```

## 🤖 CI/CD Release Script (`release-ci.js`)

**For automated environments** - No interaction required.

### Usage:
```bash
# Auto-detect version from commit message
node scripts/release-ci.js auto

# Specific version
node scripts/release-ci.js patch
node scripts/release-ci.js minor
node scripts/release-ci.js major
```

### Features:
- ✅ Auto-detects version from commit messages
- ✅ No user interaction needed
- ✅ Works in CI/CD environments
- ✅ Handles git configuration
- ✅ Skips if no NPM token

### Commit Message Detection:
- `breaking:` or `major:` → Major version
- `feat:` or `feature:` → Minor version
- `fix:`, `docs:`, `chore:`, etc. → Patch version
- Default → Patch version

## 📚 Quick Commands in package.json

```json
{
  "scripts": {
    // Interactive release wizard
    "release": "node scripts/release.js",
    
    // Quick patch release (no prompts)
    "release:quick": "npm version patch && git push --follow-tags",
    
    // Direct version commands
    "release:patch": "npm version patch",
    "release:minor": "npm version minor",
    "release:major": "npm version major",
    "release:alpha": "npm version prerelease --preid=alpha",
    "release:beta": "npm version prerelease --preid=beta"
  }
}
```

## 🔧 Script Locations

```
cogix-eye-tracking-core/
├── scripts/
│   ├── release.js       # Interactive release (for developers)
│   ├── release-ci.js    # Automated release (for CI/CD)
│   └── README.md        # This file
```

## 💡 Which Script to Use?

| Scenario | Command | Description |
|----------|---------|-------------|
| **Developer releasing manually** | `npm run release` | Interactive with prompts |
| **Quick patch release** | `npm run release:quick` | No prompts, just patch |
| **GitHub Actions** | Uses workflow | Triggered by tags |
| **Custom CI/CD** | `node scripts/release-ci.js` | Automated, no interaction |

## 🚀 Typical Developer Workflow

```bash
# 1. Make changes
git add .
git commit -m "fix: resolve connection bug"

# 2. Run interactive release
npm run release

# 3. Follow prompts
#    - Chooses patch version
#    - Confirms release
#    - Script handles everything else

# 4. Done! Package is on npm and CDN
```

## 🤖 CI/CD Integration Example

```yaml
# .github/workflows/auto-release.yml
- name: Release
  run: |
    node scripts/release-ci.js auto
  env:
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## ⚠️ Requirements

- Node.js 14+
- Git installed
- npm logged in (or NPM_TOKEN for CI)
- Push access to repository
- @iris-point organization access