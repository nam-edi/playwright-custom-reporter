const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/web/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist/web'),
    filename: 'bundle.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/web/template.html',
      filename: 'index.html',
    }),
  ],
  externals: {
    // Ces dépendances seront fournies par le bundle final
  },
};