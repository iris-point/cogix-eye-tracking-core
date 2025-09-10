# 🔐 Generated CRX Signing Keys

**Generated on**: 2025-09-10  
**Extension ID**: `bgjkmeddgmjipccn`

## ⚠️ IMPORTANT SECURITY NOTICE

The files `key.pem` and `key.pem.base64` contain your PRIVATE KEY. 

**DO NOT**:
- Commit these files to Git
- Share them publicly
- Store them in unsecured locations

**DO**:
- Back them up securely
- Use the base64 version for GitHub Secrets
- Keep the original key.pem for local builds

## Files Generated

1. **key.pem** - RSA 2048-bit private key (PEM format)
2. **key.pub** - Public key (safe to share)
3. **key.pem.base64** - Base64-encoded private key for GitHub Secrets

## GitHub Secret Setup

### 1. Copy the Base64 Value

The base64-encoded key has been saved to `key.pem.base64`. This is the value you need for GitHub Secrets.

### 2. Add to GitHub

1. Go to your repository on GitHub
2. Navigate to: **Settings → Secrets and variables → Actions**
3. Click **"New repository secret"**
4. Enter:
   - **Name**: `CRX_PRIVATE_KEY`
   - **Value**: Copy the entire content from `key.pem.base64`
5. Click **"Add secret"**

## Extension Information

- **Extension ID**: `bgjkmeddgmjipccn`
- **Key Type**: RSA 2048-bit
- **Signature Algorithm**: SHA256

This Extension ID will remain constant as long as you use this key for all builds.

## Local Testing

Test CRX generation locally:
```bash
npm run package:crx
```

This should create:
- `cogix-eye-tracking-extension.crx`
- `cogix-eye-tracking-extension-v1.0.5.crx`

## Backup Recommendations

1. **Secure Backup Locations**:
   - Password manager (recommended)
   - Encrypted cloud storage
   - Hardware security key
   - Secure USB drive in safe

2. **What to Backup**:
   - `key.pem` - The original private key
   - `key.pem.base64` - For easy GitHub Secret restoration
   - This document - For reference

## Recovery

If you lose the key:
- You'll need to generate a new one
- The Extension ID will change
- Users will need to reinstall the extension
- All user settings will be lost

## Verification

To verify the Extension ID:
```bash
node -e "const crypto = require('crypto'); const fs = require('fs'); const pubKey = fs.readFileSync('key.pub', 'utf8'); const keyObj = crypto.createPublicKey(pubKey); const keyDer = keyObj.export({type:'spki',format:'der'}); const hash = crypto.createHash('sha256').update(keyDer).digest(); const alphabet = 'abcdefghijklmnop'; let id = ''; for(let i=0; i<16; i++) id += alphabet[Math.floor(hash[i]/16)]; console.log('Extension ID:', id);"
```

Should output: `bgjkmeddgmjipccn`

## Clean Up

After setting up GitHub Secrets and backing up:
```bash
# Optional: Remove the base64 file (you have it in GitHub Secrets now)
rm key.pem.base64

# NEVER delete key.pem unless you have secure backups!
```

---

**Remember**: This key determines your Extension ID. Keep it safe and use it consistently for all releases!