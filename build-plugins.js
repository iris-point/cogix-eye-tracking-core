const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

async function buildPlugins() {
  const files = [
    'jspsych-plugin/plugin-cogix-init-camera.js',
    'jspsych-plugin/plugin-cogix-calibrate.js', 
    'jspsych-plugin/plugin-cogix-validate.js',
    'jspsych-extension/jsPsychExtensionCogixEyeTracking.js'
  ];

  for (const file of files) {
    const inputPath = path.join(__dirname, file);
    const outputName = path.basename(file);
    const outputPath = path.join(__dirname, 'dist', outputName);
    const minOutputPath = path.join(__dirname, 'dist', outputName.replace('.js', '.min.js'));

    // Read the source file
    const code = fs.readFileSync(inputPath, 'utf8');

    // Copy non-minified version
    fs.writeFileSync(outputPath, code);
    console.log(`Copied: ${outputName}`);

    // Create minified version
    try {
      const minified = await minify(code, {
        compress: true,
        mangle: true,
        format: {
          comments: false
        }
      });

      fs.writeFileSync(minOutputPath, minified.code);
      console.log(`Minified: ${outputName.replace('.js', '.min.js')}`);
    } catch (error) {
      console.error(`Error minifying ${file}:`, error);
    }
  }
}

buildPlugins().catch(console.error);