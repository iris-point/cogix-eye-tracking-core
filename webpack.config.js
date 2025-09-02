const path = require('path');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  // Build multiple bundles
  return [
    // Main SDK bundle
    {
      entry: './src/index.ts',
      output: {
        path: path.resolve(__dirname, 'dist'),
        filename: isProduction ? 'cogix-eye-tracking-core.min.js' : 'cogix-eye-tracking-core.js',
        library: 'IrisPointEyeTracking',
        libraryTarget: 'umd',
        globalObject: 'this'
      },
      module: {
        rules: [
          {
            test: /\.ts$/,
            use: 'ts-loader',
            exclude: /node_modules/
          }
        ]
      },
      resolve: {
        extensions: ['.ts', '.js']
      },
      devtool: isProduction ? 'source-map' : 'inline-source-map'
    },
    // jsPsych extension bundle
    {
      entry: './jspsych-extension/jsPsychExtensionCogixEyeTracking.js',
      output: {
        path: path.resolve(__dirname, 'dist'),
        filename: isProduction ? 'jsPsychExtensionCogixEyeTracking.min.js' : 'jsPsychExtensionCogixEyeTracking.js',
        library: 'jsPsychExtensionCogixEyeTracking',
        libraryTarget: 'umd',
        globalObject: 'this'
      },
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/
          }
        ]
      },
      resolve: {
        extensions: ['.js']
      },
      devtool: isProduction ? 'source-map' : 'inline-source-map'
    }
  ];
};