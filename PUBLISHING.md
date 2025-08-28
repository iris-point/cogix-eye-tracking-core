# Publishing to NPM and CDN Access

## Prerequisites

1. **NPM Account**: Create an account at https://www.npmjs.com/
2. **Login to NPM**: 
```bash
npm login
```

## Publishing Steps

### 1. Version Bump (choose one):
```bash
# Patch version (1.0.0 -> 1.0.1)
npm version patch

# Minor version (1.0.0 -> 1.1.0)
npm version minor

# Major version (1.0.0 -> 2.0.0)
npm version major
```

### 2. Build and Publish:
```bash
# Build the library
npm run build

# Publish to npm
npm publish --access public
```

## CDN Access

Once published to npm, the package will be automatically available on multiple CDNs:

### unpkg (Recommended)
```html
<!-- Latest version -->
<script src="https://unpkg.com/@iris-point/eye-tracking-core"></script>

<!-- Specific version -->
<script src="https://unpkg.com/@iris-point/eye-tracking-core@1.0.0"></script>

<!-- Minified version (recommended for production) -->
<script src="https://unpkg.com/@iris-point/eye-tracking-core@1.0.0/dist/cogix-eye-tracking-core.min.js"></script>
```

### jsDelivr (Fast CDN)
```html
<!-- Latest version -->
<script src="https://cdn.jsdelivr.net/npm/@iris-point/eye-tracking-core"></script>

<!-- Specific version -->
<script src="https://cdn.jsdelivr.net/npm/@iris-point/eye-tracking-core@1.0.0"></script>

<!-- Minified version -->
<script src="https://cdn.jsdelivr.net/npm/@iris-point/eye-tracking-core@1.0.0/dist/cogix-eye-tracking-core.min.js"></script>
```

### cdnjs (After approval)
After the package gains popularity, you can submit it to cdnjs:
- Submit at: https://github.com/cdnjs/packages

## Usage Examples

### Via CDN in HTML
```html
<!DOCTYPE html>
<html>
<head>
  <!-- Load from CDN -->
  <script src="https://unpkg.com/@iris-point/eye-tracking-core@latest/dist/cogix-eye-tracking-core.min.js"></script>
</head>
<body>
  <script>
    // Access via global namespace
    const { createEyeTracker, CalibrationUI } = IrisPointEyeTracking
    
    // Create tracker
    const tracker = createEyeTracker({
      wsUrl: ['ws://127.0.0.1:9000'],
      debug: true
    })
    
    // Connect and use
    tracker.connect().then(() => {
      console.log('Connected!')
    })
  </script>
</body>
</html>
```

### Via NPM
```bash
npm install @iris-point/eye-tracking-core
```

```javascript
import { createEyeTracker, CalibrationUI } from '@iris-point/eye-tracking-core'

const tracker = createEyeTracker()
await tracker.connect()
```

## Version Management

### Check Current Version
```bash
npm version
```

### View Published Versions
```bash
npm view @iris-point/eye-tracking-core versions
```

### Deprecate Old Versions (if needed)
```bash
npm deprecate @iris-point/eye-tracking-core@"< 1.0.0" "Please upgrade to latest version"
```

## Best Practices

1. **Test Before Publishing**: Always test the built files locally
2. **Semantic Versioning**: Follow semver.org guidelines
3. **Update README**: Keep documentation updated with each release
4. **Tag Releases**: Git tags are automatically created with `npm version`
5. **Check Bundle Size**: Monitor the minified size stays reasonable

## Troubleshooting

### Permission Denied
If you get permission errors:
```bash
npm owner ls @iris-point/eye-tracking-core
npm owner add <username> @iris-point/eye-tracking-core
```

### Scoped Package Issues
Ensure you're using `--access public` for scoped packages:
```bash
npm publish --access public
```

### CDN Not Updating
CDNs cache packages. To force update:
- unpkg: Add `?meta` to see metadata
- jsDelivr: Wait 12 hours or purge cache at https://www.jsdelivr.com/tools/purge

## Quick Publish Script

Add to package.json scripts:
```json
"release:patch": "npm version patch && npm run build && npm publish --access public",
"release:minor": "npm version minor && npm run build && npm publish --access public",
"release:major": "npm version major && npm run build && npm publish --access public"
```

Then use:
```bash
npm run release:patch
```