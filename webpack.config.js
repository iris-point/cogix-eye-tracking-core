const path = require('path');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/index.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'index.umd.min.js' : 'index.umd.js',
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
  };
};