const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

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
    // Copy and minify plugin/extension files directly (they're already IIFE format)
    {
      entry: './src/dummy.js', // Dummy entry since we're just copying
      output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'dummy.js' // Will be deleted
      },
      plugins: [
        new CopyWebpackPlugin({
          patterns: [
            // Copy and optionally minify plugin files
            {
              from: 'jspsych-plugin/plugin-cogix-init-camera.js',
              to: isProduction ? 'plugin-cogix-init-camera.min.js' : 'plugin-cogix-init-camera.js',
              transform: isProduction ? undefined : (content) => content,
              transformPath: (targetPath) => targetPath
            },
            {
              from: 'jspsych-plugin/plugin-cogix-calibrate.js',
              to: isProduction ? 'plugin-cogix-calibrate.min.js' : 'plugin-cogix-calibrate.js',
              transform: isProduction ? undefined : (content) => content,
              transformPath: (targetPath) => targetPath
            },
            {
              from: 'jspsych-plugin/plugin-cogix-validate.js',
              to: isProduction ? 'plugin-cogix-validate.min.js' : 'plugin-cogix-validate.js',
              transform: isProduction ? undefined : (content) => content,
              transformPath: (targetPath) => targetPath
            },
            // Also copy non-minified versions in production
            ...(isProduction ? [
              {
                from: 'jspsych-plugin/plugin-cogix-init-camera.js',
                to: 'plugin-cogix-init-camera.js'
              },
              {
                from: 'jspsych-plugin/plugin-cogix-calibrate.js',
                to: 'plugin-cogix-calibrate.js'
              },
              {
                from: 'jspsych-plugin/plugin-cogix-validate.js',
                to: 'plugin-cogix-validate.js'
              }
            ] : [])
          ]
        })
      ],
      optimization: {
        minimize: isProduction,
        minimizer: isProduction ? [
          new TerserPlugin({
            test: /\.min\.js$/,
            terserOptions: {
              compress: true,
              mangle: true,
              format: {
                comments: false
              }
            }
          })
        ] : []
      }
    }
  ];
};