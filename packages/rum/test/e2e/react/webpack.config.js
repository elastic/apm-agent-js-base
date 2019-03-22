/**
 * MIT License
 *
 * Copyright (c) 2017-present, Elasticsearch BV
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

const path = require('path')
const { EnvironmentPlugin } = require('webpack')
const { getWebpackEnv } = require('../../../../../dev-utils/test-config')

module.exports = {
  entry: path.resolve(__dirname, './app.jsx'),
  output: { path: __dirname, filename: 'app.e2e-bundle.js' },
  devtool: 'source-map',
  mode: 'production',
  performance: {
    hints: false
  },
  module: {
    rules: [
      {
        test: /.jsx?$/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  plugins: [new EnvironmentPlugin(getWebpackEnv())]
}
