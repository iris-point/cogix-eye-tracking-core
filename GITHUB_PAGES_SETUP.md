# GitHub Pages Setup Instructions

## Files Prepared
✅ `index.html` - Main experiment file (copied from experiment.html)
✅ `assets/` - All experiment images and instructions
✅ `_config.yml` - GitHub Pages configuration

## Next Steps to Publish

### 1. Commit and Push Changes
```bash
# Commit the changes
git add index.html assets/ _config.yml
git commit -m "Add emotion regulation experiment for GitHub Pages"
git push origin main
```

### 2. Enable GitHub Pages
1. Go to https://github.com/iris-point/cogix-eye-tracking-core
2. Click on **Settings** tab
3. Scroll down to **Pages** section (in left sidebar)
4. Under **Source**, select:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**
5. Click **Save**

### 3. Access Your Live Experiment
After a few minutes, your experiment will be available at:
**https://iris-point.github.io/cogix-eye-tracking-core/**

## Features Included
- Full 9-point Likert scale emotion rating
- Practice trials (6 trials)
- Formal experiment (28 trials)
- Participant information collection
- Automatic CSV data export
- Fullscreen mode
- Dark theme interface
- Chinese/English bilingual labels

## Testing
- The experiment works directly in the browser
- No server required for basic functionality
- Data saves locally as CSV files
- Eye-tracking features are optional

## File Structure
```
/ (root)
├── index.html          # Main experiment
├── _config.yml         # GitHub Pages config
└── assets/
    └── images/
        ├── (1-28).jpg  # Experiment stimuli
        ├── H(1-3).jpg  # Practice high arousal
        ├── L(1-3).jpg  # Practice low arousal
        └── instructions/ # Instruction images
```

## Browser Compatibility
- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (with limited functionality)

## Updates
To update the experiment:
1. Modify `eye-tracking-emotion-experiment/experiment.html`
2. Copy to root: `cp eye-tracking-emotion-experiment/experiment.html index.html`
3. Commit and push changes
4. GitHub Pages will automatically update within minutes