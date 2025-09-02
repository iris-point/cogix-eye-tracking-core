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
    },
    // Cogix init camera plugin
    {
      entry: './jspsych-plugin/plugin-cogix-init-camera.js',
      output: {
        path: path.resolve(__dirname, 'dist'),
        filename: isProduction ? 'plugin-cogix-init-camera.min.js' : 'plugin-cogix-init-camera.js',
        library: 'jsPsychCogixInitCamera',
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
    },
    // Cogix calibrate plugin
    {
      entry: './jspsych-plugin/plugin-cogix-calibrate.js',
      output: {
        path: path.resolve(__dirname, 'dist'),
        filename: isProduction ? 'plugin-cogix-calibrate.min.js' : 'plugin-cogix-calibrate.js',
        library: 'jsPsychCogixCalibrate',
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
    },
    // Cogix validate plugin
    {
      entry: './jspsych-plugin/plugin-cogix-validate.js',
      output: {
        path: path.resolve(__dirname, 'dist'),
        filename: isProduction ? 'plugin-cogix-validate.min.js' : 'plugin-cogix-validate.js',
        library: 'jsPsychCogixValidate',
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