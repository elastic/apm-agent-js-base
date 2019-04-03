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

import { getCurrentScript, sanitizeString, setTag, merge } from './utils'
import Subscription from '../common/subscription'
import { serverStringLimit } from './constants'

function getConfigFromScript() {
  var script = getCurrentScript()
  var config = getDataAttributesFromNode(script)
  return config
}

function getDataAttributesFromNode(node) {
  if (!node) {
    return {}
  }
  var dataAttrs = {}
  var dataRegex = /^data-([\w-]+)$/
  var attrs = node.attributes
  for (var i = 0; i < attrs.length; i++) {
    var attr = attrs[i]
    if (dataRegex.test(attr.nodeName)) {
      var key = attr.nodeName.match(dataRegex)[1]

      // camelCase key
      var camelCasedkey = key
        .split('-')
        .map((value, index) => {
          return index > 0
            ? value.charAt(0).toUpperCase() + value.substring(1)
            : value
        })
        .join('')

      dataAttrs[camelCasedkey] = attr.value || attr.nodeValue
    }
  }

  return dataAttrs
}

class Config {
  constructor() {
    this.config = {}
    this.defaults = {
      serviceName: '',
      serviceVersion: '',
      environment: '',
      serverUrl: 'http://localhost:8200',
      serverUrlPrefix: '/intake/v2/rum/events',
      active: true,
      debug: false,
      logLevel: 'warn',
      browserResponsivenessInterval: 500,
      browserResponsivenessBuffer: 3,
      checkBrowserResponsiveness: true,
      groupSimilarSpans: true,
      similarSpanThreshold: 0.05,
      capturePageLoad: true,
      ignoreTransactions: [],
      // throttlingRequestLimit: 20,
      // throttlingInterval: 30000, // 30s
      errorThrottleLimit: 20,
      errorThrottleInterval: 30000,
      transactionThrottleLimit: 20,
      transactionThrottleInterval: 30000,
      transactionDurationThreshold: 60000,

      queueLimit: -1,
      flushInterval: 500,

      sendPageLoadTransaction: true,

      serverStringLimit,

      distributedTracing: true,
      distributedTracingOrigins: [],
      distributedTracingHeaderValueCallback: getDtHeaderValue,
      distributedTracingHeaderName: 'elastic-apm-traceparent',

      pageLoadTraceId: '',
      pageLoadSpanId: '',
      pageLoadSampled: false,
      pageLoadTransactionName: '',

      transactionSampleRate: 1.0,

      context: {}
    }

    this._changeSubscription = new Subscription()
    this.filters = []
    /**
     * Packages that uses rum-core under the hood must override
     * the version via setVersion
     */
    this.version = ''
  }

  init() {
    var scriptData = getConfigFromScript()
    this.setConfig(scriptData)
  }

  isActive() {
    return this.get('active')
  }

  setVersion(version) {
    this.version = version
  }

  addFilter(cb) {
    if (typeof cb !== 'function') {
      throw new Error('Argument to must be function')
    }
    this.filters.push(cb)
  }

  applyFilters(data) {
    for (var i = 0; i < this.filters.length; i++) {
      data = this.filters[i](data)
      if (!data) {
        return
      }
    }
    return data
  }

  get(key) {
    return key.split('.').reduce((obj, objKey) => {
      return obj && obj[objKey]
    }, this.config)
  }

  getEndpointUrl() {
    var url = this.get('serverUrl') + this.get('serverUrlPrefix')
    return url
  }

  set(key, value) {
    var levels = key.split('.')
    var maxLevel = levels.length - 1
    var target = this.config

    for (let i = 0; i < maxLevel + 1; i++) {
      const level = levels[i]
      if (!level) {
        continue
      }
      if (i === maxLevel) {
        target[level] = value
      } else {
        var obj = target[level] || {}
        target[level] = obj
        target = obj
      }
    }
  }

  setUserContext(userContext = {}) {
    const context = {}
    const { id, username, email } = userContext
    const serverStringLimit = this.get('serverStringLimit')

    if (typeof id === 'number') {
      context.id = id
    }
    if (typeof id === 'string') {
      context.id = sanitizeString(id, serverStringLimit)
    }
    if (typeof username === 'string') {
      context.username = sanitizeString(username, serverStringLimit)
    }
    if (typeof email === 'string') {
      context.email = sanitizeString(email, serverStringLimit)
    }
    this.set('context.user', context)
  }

  setCustomContext(customContext) {
    if (customContext && typeof customContext === 'object') {
      this.set('context.custom', customContext)
    }
  }

  addTags(tags) {
    if (!this.config.context.tags) {
      this.config.context.tags = {}
    }
    var keys = Object.keys(tags)
    keys.map(k => setTag(k, tags[k], this.config.context.tags))
  }

  setConfig(properties = {}) {
    this.config = merge({}, this.defaults, this.config, properties)
    this._changeSubscription.applyAll(this, [this.config])
  }

  subscribeToChange(fn) {
    return this._changeSubscription.subscribe(fn)
  }

  isValid() {
    const requiredKeys = ['serviceName', 'serverUrl']

    for (let i = 0; i < requiredKeys.length; i++) {
      const key = requiredKeys[i]
      if (this.config[key] == null || this.config[key] === '') {
        return false
      }
    }

    return true
  }
}

export default Config
