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
const defaultApmServerUrl = 'http://localhost:8200'

function getSauceConnectOptions() {
  return {
    username: process.env.SAUCE_USERNAME,
    accessKey: process.env.SAUCE_ACCESS_KEY,
    logger: console.log,
    noSslBumpDomains: 'all',
    tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER,
    connectRetries: 3
  }
}

function getTestEnvironmentVariables() {
  return {
    branch: process.env.TRAVIS_BRANCH,
    mode: process.env.MODE,
    sauceLabs: process.env.MODE && process.env.MODE.startsWith('saucelabs'),
    isTravis: process.env.TRAVIS,
    serverUrl: process.env.APM_SERVER_URL || defaultApmServerUrl
  }
}

function getGlobalConfig(packageName = 'rum') {
  const env = getTestEnvironmentVariables()
  const globalConfigs = {
    agentConfig: {
      serverUrl: env.serverUrl,
      serviceName: `test`,
      agentName: `${packageName}`,
      agentVersion: '0.0.1'
    },
    useMocks: false,
    mockApmServer: false
  }

  /**
   * Use this for testing locally
   */
  // if (env.sauceLabs) {
  //   globalConfigs.useMocks = true
  // }

  return {
    globalConfigs,
    testConfig: env
  }
}

/**
 * Used for injecting process.env across webpack bundles for testing
 */
function getWebpackEnv() {
  return {
    APM_SERVER_URL: defaultApmServerUrl
  }
}

module.exports = {
  getSauceConnectOptions,
  getTestEnvironmentVariables,
  getGlobalConfig,
  getWebpackEnv
}
