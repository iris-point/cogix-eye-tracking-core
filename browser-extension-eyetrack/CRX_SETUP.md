# 🔐 CRX Package Setup Guide

This guide explains how to generate and distribute CRX packages for the Chrome extension.

## What is a CRX File?

A CRX file is a Chrome Extension package that can be installed directly without using the Chrome Web Store. It's digitally signed for security and allows for easier distribution.

## Advantages of CRX over ZIP

- ✅ **One-click installation** - Users can drag and drop to install
- ✅ **Digital signature** - Ensures package integrity
- ✅ **Consistent Extension ID** - Important for updates and permissions
- ✅ **Professional distribution** - Similar to store-published extensions

## Local CRX Generation

### First Time Setup

1. **Generate CRX with automatic key generation:**
   ```bash
   npm run package:crx
   ```
   This will:
   - Generate a new RSA key pair (`key.pem` and `key.pub`)
   - Create the CRX file
   - Display your unique Extension ID
   - Add `key.pem` to `.gitignore` automatically

2. **IMPORTANT: Backup your private key!**
   ```bash
   # Copy to a secure location
   cp key.pem ~/secure-backup/cogix-extension-key.pem
   ```
   ⚠️ **Never commit `key.pem` to git!** This is your private signing key.

### Subsequent Builds

Once you have a key, future builds will use it automatically:
```bash
npm run build:prod
npm run package:crx
```

## CI/CD Setup (GitHub Actions)

### Setting up the CRX Private Key Secret

1. **Generate a base64-encoded version of your key:**
   ```bash
   # On Windows (PowerShell)
   [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("key.pem")) | clip
   
   # On Mac/Linux
   base64 -i key.pem | pbcopy  # Mac
   base64 key.pem | xclip -selection clipboard  # Linux
   ```

2. **Add to GitHub Secrets:**
   - Go to your repository on GitHub
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `CRX_PRIVATE_KEY`
   - Value: Paste the base64-encoded key
   - Click "Add secret"

3. **Verify in workflow:**
   The publish workflow will now use this key for consistent Extension IDs across releases.

## Extension ID Management

### Finding Your Extension ID

After generating your first CRX:
```bash
node -e "console.log(require('./crx-metadata.json').extensionId)"
```

Or check the console output when running `npm run package:crx`.

### Why Extension ID Matters

- **Updates**: Chrome uses the ID to check for updates
- **Permissions**: Some permissions are tied to the Extension ID
- **User Settings**: User preferences are stored per Extension ID
- **Enterprise Deployment**: IT departments whitelist specific Extension IDs

### Maintaining Consistent IDs

- ✅ Always use the same `key.pem` for all builds
- ✅ Store the key securely (password manager, secure vault)
- ✅ Use GitHub Secrets for CI/CD builds
- ❌ Never regenerate the key unless absolutely necessary

## Distribution Methods

### 1. Direct CRX Download
```html
<a href="https://github.com/your-org/repo/releases/download/v1.0.5/cogix-eye-tracking-extension.crx">
  Download Extension (CRX)
</a>
```

### 2. Hosted Installation Page
Users visit your GitHub Pages site and click install:
```
https://your-org.github.io/cogix-eye-tracking-core/
```

### 3. Enterprise Deployment
IT administrators can deploy using Group Policy:
```json
{
  "ExtensionInstallSources": [
    "https://github.com/*",
    "https://your-org.github.io/*"
  ]
}
```

## Update Mechanism

### Manual Updates
Users can check for updates in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Update" button

### Automatic Updates (Future)
Create an update manifest (`update.xml`):
```xml
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='YOUR_EXTENSION_ID'>
    <updatecheck codebase='https://your-org.github.io/extension.crx' 
                 version='1.0.6' />
  </app>
</gupdate>
```

## Troubleshooting

### "Package is invalid" Error
- Ensure you're using the same key for all builds
- Check that the manifest.json is valid
- Verify the CRX file isn't corrupted during download

### "Extension ID has changed"
- This happens when using different keys
- Always use the same `key.pem` file
- Set up `CRX_PRIVATE_KEY` secret in GitHub

### CRX Generation Fails in CI
- Check that `CRX_PRIVATE_KEY` secret is properly set
- Ensure the base64 encoding is correct
- Verify the workflow has necessary permissions

## Security Best Practices

1. **Protect Your Private Key**
   - Store in a password manager
   - Use encrypted backup locations
   - Never share or expose publicly

2. **Rotate Keys Carefully**
   - Only if compromised
   - Notify users of ID change
   - Provide migration instructions

3. **Sign All Releases**
   - Use the same key consistently
   - Include checksums in releases
   - Verify package integrity

## Alternative: Using Chrome Web Store

If you later decide to publish to Chrome Web Store:
1. You'll get a new Extension ID (store-assigned)
2. Users will need to uninstall the CRX version
3. Store provides automatic updates
4. No need to manage keys yourself

## Commands Reference

```bash
# Generate icons
npm run generate-icons
npm run generate-png

# Build extension
npm run build:prod

# Package as ZIP
npm run package:zip

# Package as CRX
npm run package:crx

# Full release
npm run release

# Clean build
npm run clean
```

## Support

For issues with CRX generation:
1. Check the error message in console
2. Verify key.pem exists and is valid
3. Ensure you have crx3 installed: `npm install -g crx3`
4. Try manual generation: `node scripts/generate-crx.js`