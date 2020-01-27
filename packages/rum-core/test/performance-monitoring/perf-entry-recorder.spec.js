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
import Transaction from '../../src/performance-monitoring/transaction'
import { PAGE_LOAD, TYPE_CUSTOM, LONG_TASK } from '../../src/common/constants'
import {
  onPerformanceEntry,
  PerfEntryRecorder
} from '../../src/performance-monitoring/perf-entry-recorder'
import { mockObserverEntryTypes } from '../utils/globals-mock'

describe('PerfEntryRecorder', () => {
  const mockEntryList = {
    getEntriesByType: mockObserverEntryTypes
  }

  it('should create long tasks spans for all transaction types', () => {
    const pageLoadTransaction = new Transaction('/', PAGE_LOAD)
    onPerformanceEntry(mockEntryList, pageLoadTransaction)

    const getLtSpans = tr => tr.spans.filter(span => span.type === LONG_TASK)

    expect(getLtSpans(pageLoadTransaction).length).toEqual(2)

    const customTransaction = new Transaction('/', TYPE_CUSTOM)
    onPerformanceEntry(mockEntryList, customTransaction)

    expect(getLtSpans(customTransaction).length).toEqual(2)
  })

  it('should mark largest contentful paint only for page-load transaction', () => {
    const pageLoadTransaction = new Transaction('/', PAGE_LOAD)
    onPerformanceEntry(mockEntryList, pageLoadTransaction)

    expect(pageLoadTransaction.marks.agent.largestContentfulPaint).toEqual(
      1040.0399999925867
    )

    const customTransaction = new Transaction('/', TYPE_CUSTOM)
    onPerformanceEntry(mockEntryList, customTransaction)

    expect(customTransaction.marks).toBeUndefined()
  })

  it('should start recording on all browsers without errors', () => {
    const recorder = new PerfEntryRecorder(() => {})
    recorder.start()
    recorder.stop()
  })
})
