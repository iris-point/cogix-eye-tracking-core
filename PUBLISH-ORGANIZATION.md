# Publishing to NPM under @iris-point Organization

## Prerequisites

### 1. Create NPM Organization (One-time setup)
1. Go to https://www.npmjs.com/org/create
2. Create organization named `iris-point`
3. Choose "Unlimited public packages" (free)

### 2. Join Organization (For team members)
- Organization owner invites members at: https://www.npmjs.com/settings/iris-point/members
- Or members can request to join

### 3. Login to NPM
```bash
npm login
```
Enter your npm username, password, and email.

## Publishing the Package

### Step 1: Verify Organization Access
```bash
# Check if you're logged in
npm whoami

# Check organization membership
npm org ls iris-point
```

### Step 2: Build and Publish
```bash
cd cogix-eye-tracking-core

# Build the package
npm run build

# Publish to npm under @iris-point scope (PUBLIC)
npm publish --access public
```

**Important**: The `--access public` flag is REQUIRED for scoped packages to be public!

### Step 3: Verify Publication
```bash
# Check if package is published
npm view @iris-point/eye-tracking-core

# View all versions
npm view @iris-point/eye-tracking-core versions --json
```

## Organization Management

### Add Team Members
```bash
# Add a member with read/write access
npm org set iris-point <username> developer

# Add a member with admin access
npm org set iris-point <username> admin

# View all members
npm org ls iris-point
```

### Package Access Control
```bash
# Grant user access to specific package
npm access grant read-write @iris-point/eye-tracking-core <username>

# View package access
npm access ls-packages @iris-point/eye-tracking-core

# View collaborators
npm access ls-collaborators @iris-point/eye-tracking-core
```

## First-Time Publishing Checklist

- [ ] Organization `iris-point` exists on npm
- [ ] You are a member of the organization
- [ ] You are logged in: `npm whoami`
- [ ] Package name is `@iris-point/eye-tracking-core` in package.json
- [ ] PublishConfig has `"access": "public"` in package.json
- [ ]dist folder exists with built files
- [ ] Version number is correct in package.json

## Publishing Commands

### Quick Publish (with version bump)
```bash
# Patch release (1.0.0 -> 1.0.1)
npm version patch && npm run build && npm publish --access public

# Minor release (1.0.0 -> 1.1.0)
npm version minor && npm run build && npm publish --access public

# Major release (1.0.0 -> 2.0.0)
npm version major && npm run build && npm publish --access public
```

### Manual Publish (current version)
```bash
npm run build
npm publish --access public
```

## After Publishing

### CDN Access
The package will be automatically available on CDNs within minutes:

- **unpkg**: https://unpkg.com/@iris-point/eye-tracking-core/
- **jsDelivr**: https://cdn.jsdelivr.net/npm/@iris-point/eye-tracking-core/
- **Package page**: https://www.npmjs.com/package/@iris-point/eye-tracking-core

### Test CDN Access
```html
<!-- Test if CDN is working -->
<script src="https://unpkg.com/@iris-point/eye-tracking-core/dist/cogix-eye-tracking-core.min.js"></script>
<script>
  console.log('IrisPointEyeTracking loaded:', typeof IrisPointEyeTracking !== 'undefined')
</script>
```

## Troubleshooting

### Error: "You must sign up for private packages"
**Solution**: Add `--access public` flag when publishing

### Error: "You do not have permission to publish"
**Solution**: 
1. Check organization membership: `npm org ls iris-point`
2. Ask admin to add you: `npm org set iris-point <your-username> developer`

### Error: "Package name too similar to existing packages"
**Solution**: This shouldn't happen with @iris-point scope. If it does, the scope ensures uniqueness.

### CDN Not Showing Latest Version
**Solution**: 
- unpkg: Add `@latest` to force latest: `https://unpkg.com/@iris-point/eye-tracking-core@latest/`
- jsDelivr: Clear cache at https://www.jsdelivr.com/tools/purge

## Security Notes

1. **Never publish sensitive data** - Check .npmignore file
2. **Use 2FA** - Enable two-factor authentication on npm account
3. **Review before publish** - Run `npm pack --dry-run` to see what will be published
4. **Token management** - Use npm tokens for CI/CD: `npm token create`

## Package.json Configuration Verified ✅

```json
{
  "name": "@iris-point/eye-tracking-core",  ✅ Scoped to @iris-point
  "publishConfig": {
    "access": "public"  ✅ Set to public
  }
}
```

Ready to publish! 🚀