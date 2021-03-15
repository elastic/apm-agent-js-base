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

const {
  allowSomeBrowserErrors,
  waitForApmServerCalls,
  getBrowserInfo
} = require('../../../../../dev-utils/webdriver')

describe('General usecase with react-router', function() {
  beforeAll(() => browser.url('/test/e2e/with-router/'))

  it('should run the react app', function() {
    browser.waitUntil(
      () => {
        return $('#test-element').getText() === 'Passed'
      },
      5000,
      'expected element #test-element'
    )

    const { sendEvents } = waitForApmServerCalls(0, 1)
    const { transactions } = sendEvents

    expect(transactions.length).toBe(1)
    const transaction = transactions[0]
    expect(transaction.type).toBe('page-load')
    expect(transaction.name).toBe('/home')
    expect(transaction.spans.length).toBeGreaterThan(1)

    const spanNames = [
      'Requesting and receiving the document',
      'Parsing the document, executing sync. scripts',
      'GET /test/e2e/data.json',
      'Render'
    ]
    var foundSpans = transaction.spans.filter(span => {
      return spanNames.indexOf(span.name) > -1
    })

    expect(foundSpans.length).toBeGreaterThanOrEqual(4)

    return allowSomeBrowserErrors()
  })

  it('should capture resoure and user timing spans for soft navigation', () => {
    browser.waitUntil(
      () => {
        /**
         * Click a link to trigger the rendering of lazy navigation
         */
        $('#manual').click()
        const componentContainer = $('#manual-container')
        return componentContainer.getText().indexOf('Manual') !== -1
      },
      5000,
      'expected manual component to be rendered'
    )

    const { sendEvents } = waitForApmServerCalls(0, 2)
    const { transactions } = sendEvents

    const pageLoadTransaction = transactions[0]
    expect(pageLoadTransaction.type).toBe('page-load')
    expect(pageLoadTransaction.name).toBe('/home')

    const routeTransaction = transactions[1]
    expect(routeTransaction.name).toBe('ManualComponent')
    expect(routeTransaction.type).toBe('component')

    const spanTypes = ['app', 'resource', 'external']
    const foundSpans = routeTransaction.spans.filter(
      span => spanTypes.indexOf(span.type) > -1
    )
    /**
     * `app` and `resource` span type will not be captured in safari 9 since
     * User and Resource Timing API is not supported.
     */
    const { name } = getBrowserInfo()
    if (name.indexOf('safari') >= 0) {
      expect(foundSpans.length).toBeGreaterThanOrEqual(1)
    } else {
      expect(foundSpans.length).toBeGreaterThanOrEqual(3)
    }
  })
})
