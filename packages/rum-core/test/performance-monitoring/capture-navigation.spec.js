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

import {
  createNavigationTimingSpans,
  createResourceTimingSpans,
  createUserTimingSpans,
  captureNavigation
} from '../../src/performance-monitoring/capture-navigation'
import Transaction from '../../src/performance-monitoring/transaction'
import resourceEntries from '../fixtures/resource-entries'
import userTimingEntries from '../fixtures/user-timing-entries'
import navTimingSpans from '../fixtures/navigation-timing-span-snapshot'
import { TIMING_LEVEL1_ENTRY as timings } from '../fixtures/navigation-entries'
import { PAGE_LOAD } from '../../src/common/constants'
import { mockGetEntriesByType } from '../utils/globals-mock'

const spanSnapshot = navTimingSpans.map(mapSpan)

function mapSpan(s) {
  return { name: s.name, _end: s._end, _start: s._start }
}

describe('Capture hard navigation', function() {
  /**
   * Arbitrary value considering the transcation end would be called
   * after load event has finished
   */
  const transactionEnd = timings.loadEventEnd + 100
  const transactionStart = 0
  it('should createNavigationTimingSpans', function() {
    let spans = createNavigationTimingSpans(
      timings,
      timings.fetchStart,
      transactionStart,
      transactionEnd
    )

    expect(spans.map(mapSpan)).toEqual([
      { name: 'Requesting and receiving the document', _end: 947, _start: 7 },
      {
        name: 'Parsing the document, executing sync. scripts',
        _end: 1464,
        _start: 820
      },
      { name: 'Fire "DOMContentLoaded" event', _end: 1498, _start: 1464 },
      { name: 'Fire "load" event', _end: 2874, _start: 2852 }
    ])

    const fetchStartValues = [undefined, null, Number(new Date()), 0, 1]
    for (let i = 0; i < fetchStartValues.length; i++) {
      const value = fetchStartValues[i]
      const timingObj = { ...timings, fetchStart: value }
      const spans = createNavigationTimingSpans(
        timingObj,
        timingObj.fetchStart,
        transactionStart,
        transactionEnd
      )
      expect(spans).toEqual([])
    }

    const requestStartValues = [undefined, null, 0, 1, Number(new Date())]
    for (let i = 0; i < requestStartValues.length; i++) {
      const value = requestStartValues[i]
      const timingObj = { ...timings, requestStart: value }
      const spans = createNavigationTimingSpans(
        timingObj,
        timingObj.fetchStart,
        transactionStart,
        transactionEnd
      )
      expect(spans.map(mapSpan)).toEqual([
        {
          name: 'Parsing the document, executing sync. scripts',
          _end: 1464,
          _start: 820
        },
        { name: 'Fire "DOMContentLoaded" event', _end: 1498, _start: 1464 },
        { name: 'Fire "load" event', _end: 2874, _start: 2852 }
      ])
    }

    const domInteractiveValues = [undefined, null, 0, 1, Number(new Date())]
    for (let i = 0; i < domInteractiveValues.length; i++) {
      const value = domInteractiveValues[i]
      const timingObj = {
        ...timings,
        domInteractive: value,
        requestStart: Number(new Date())
      }
      const spans = createNavigationTimingSpans(
        timingObj,
        timingObj.fetchStart,
        transactionStart,
        transactionEnd
      )
      expect(spans.map(mapSpan)).toEqual([
        { name: 'Fire "DOMContentLoaded" event', _end: 1498, _start: 1464 },
        { name: 'Fire "load" event', _end: 2874, _start: 2852 }
      ])
    }

    const timingObj = {
      ...timings,
      domInteractive: 0,
      requestStart: 0,
      domContentLoadedEventStart: 'a',
      domContentLoadedEventEnd: 'testing'
    }
    spans = createNavigationTimingSpans(
      timingObj,
      timingObj.fetchStart,
      transactionStart,
      transactionEnd
    )
    expect(spans.map(mapSpan)).toEqual([
      { name: 'Fire "load" event', _end: 2874, _start: 2852 }
    ])
  })

  it('should createResourceTimingSpans', function() {
    const spans = createResourceTimingSpans(
      resourceEntries,
      ['http://ajax-filter.test'],
      transactionStart,
      transactionEnd
    )
    const lastSpanContext = spans[spans.length - 1].context
    expect(lastSpanContext).toEqual(
      jasmine.objectContaining({
        http: {
          url: jasmine.any(String),
          response: {
            transfer_size: 420580,
            encoded_body_size: 420379,
            decoded_body_size: 420379
          }
        }
      })
    )

    expect(spans.map(mapSpan)).toEqual(spanSnapshot)
  })

  it('should createUserTimingSpans', function() {
    const spans = createUserTimingSpans(
      userTimingEntries,
      transactionStart,
      transactionEnd
    )
    expect(spans.length).toEqual(3)
    expect(spans).toEqual([
      jasmine.objectContaining({
        name: 'measure_1',
        type: 'app',
        _start: 0,
        _end: 1052.5299999972049,
        ended: true
      }),
      jasmine.objectContaining({
        name: 'measure_2',
        type: 'app',
        _start: 0,
        _end: 2119.7900000006484,
        ended: true
      }),
      jasmine.objectContaining({
        name: 'measure_5',
        type: 'app',
        _start: 0,
        _end: 100.7900000006484,
        ended: true
      })
    ])
  })

  it('should capture spans for hard navigation', function() {
    const tr = new Transaction('test', PAGE_LOAD)
    tr.end()
    captureNavigation(tr)
    expect(tr.spans.length).toBeGreaterThan(1)
  })

  it('should capture spans for soft navigation', function() {
    const unmock = mockGetEntriesByType()
    const tr = new Transaction('test', 'spa')
    const xhrSpan = tr.startSpan('GET http://example.com', 'external.http')
    xhrSpan.end()
    tr.end()
    tr._start = 0
    captureNavigation(tr)
    expect(tr.spans.length).toBeGreaterThan(1)
    const foundSpans = tr.spans.filter(span => span.name === xhrSpan.name)
    expect(foundSpans.length).toBe(1)
    unmock()
  })

  it('should fix custom marks when changing transaction._start', function() {
    var tr = new Transaction('test', PAGE_LOAD)
    tr.mark('testMark')
    const markValue = tr.marks.custom.testMark
    const start = tr._start
    expect(markValue).toBeGreaterThanOrEqual(0)
    expect(start).toBeGreaterThan(0)
    tr.end()
    captureNavigation(tr)
    expect(tr.marks.custom.testMark).toEqual(start + markValue)
  })
})
