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
  LONG_TASK,
  LARGEST_CONTENTFUL_PAINT,
  PAGE_LOAD
} from '../common/constants'
import { noop } from '../common/utils'
import Span from './span'

/**
 * Detects if the given transaction is managed by the agent
 */
function isManaged(transaction) {
  return transaction.captureTimings
}

/**
 * Checks whether the give transaction is a page load transaction
 */
function isPageLoadTransaction(transaction) {
  return transaction.type === PAGE_LOAD
}

/**
 * Create Spans for the long task entries
 * Spec - https://w3c.github.io/longtasks/
 */
function createLongTaskSpans(longtasks) {
  if (longtasks.length === 0) {
    return
  }

  const longTaskSpans = []
  for (let i = 0; i < longtasks.length; i++) {
    /**
     * name of the long task can be any one of the type listed here
     * depeding on the origin of the longtask
     * https://w3c.github.io/longtasks/#sec-PerformanceLongTaskTiming
     */
    const { name, startTime, duration, attribution } = longtasks[i]
    const end = startTime + duration
    const kind = LONG_TASK
    const span = new Span(`Longtask(${name})`, kind, { startTime })

    /**
     * use attribution data to figure out the culprits of the longtask
     * https://w3c.github.io/longtasks/#sec-TaskAttributionTiming
     *
     * Based on the same-origin policy, we can figure out the culprit from
     * the attribution data
     */
    if (attribution.length > 0) {
      const { name, containerType, containerName, containerId } = attribution[0]

      /**
       * name - identifies the type of work responsible for the long task
       * such as `unknown`, `script`, `layout`
       *
       * containerType - type of the culprit browsing context container such as
       * 'iframe', 'embed', 'object' or 'window'
       *
       * Based on the container type, the name, id and src would be populated in
       * the respective fields when available or empty string (ex: If iframe
       * type caused the longtask, id and name of the Iframe would be populated)
       *
       * `containerSrc` is not used as it could be large url/blob and it would
       * increase the payload size, showing id/name would be enough to asosicate the origin
       */
      const customContext = {
        attribution: name,
        type: containerType
      }
      if (containerName) {
        customContext.name = containerName
      }
      if (containerId) {
        customContext.id = containerId
      }
      span.addContext({
        custom: customContext
      })
    }

    span.end(end)

    longTaskSpans.push(span)
  }
  return longTaskSpans
}

export function onPerformanceEntry(list, transaction) {
  const longtaskEntries = list.getEntriesByType(LONG_TASK)

  transaction.spans.push(...createLongTaskSpans(longtaskEntries))
  /**
   * Paint timings like FCP and LCP are available only for page-load navigation
   */
  if (!isPageLoadTransaction(transaction)) {
    return
  }

  const lcpEntries = list.getEntriesByType(LARGEST_CONTENTFUL_PAINT)
  /**
   * There can be multiple LCP present on a single page load,
   * We need to always use the last one which takes all the lazy loaded
   * elements in to account
   */
  const lastLcpEntry = lcpEntries[lcpEntries.length - 1]
  if (!lastLcpEntry) {
    return
  }
  /**
   * `renderTime` will not be available for Image element and for the element
   * that is loaded cross-origin without the `Timing-Allow-Origin` header.
   */
  transaction.addMarks({
    agent: {
      largestContentfulPaint: lastLcpEntry.renderTime || lastLcpEntry.loadTime
    }
  })
}

/**
 * Records all performance entry events available via Performance Observer
 * and fallbacks to Performance Timeline if not supported
 *
 * Entry types such as `resource`, `paint` and `measure` are recorded via
 * Performance Timeline instead of the Observer since the buffering for
 * certian events are not supported and we would end up in using both
 * in certian browsers which adds performance cost.
 *
 * So we stick to PerformanceObserver only for new entry types like `longtask` and
 * `largest-contentful-paint`
 */
export class PerfEntryRecorder {
  constructor(callback) {
    this.po = {
      observe: noop,
      disconnect: noop
    }
    if (window.PerformanceObserver) {
      this.po = new PerformanceObserver(callback)
    }
  }

  start(transaction) {
    /**
     * Only observe for managed transactions
     */
    if (!isManaged(transaction)) {
      return
    }
    /**
     * Safari throws an error when PerformanceObserver is
     * observed for unknown entry types as longtasks and lcp is
     * not supported at the moment
     */
    try {
      /**
       * Start observing for different entry types depending on the transaction type
       * - Except longtasks other entries support buffered flag for performance entries
       * - `buffered`: true means we would be able to retrive all the events that happened
       * before calling the observe method
       * - We are using type instead of entryTypes in the options since
       *   browsers would throw error when using entryTypes options along with
       *   buffered flag (https://w3c.github.io/performance-timeline/#observe-method)
       */
      if (isPageLoadTransaction(transaction)) {
        /**
         * Largest Contentful Paint is a draft spec and its not W3C standard yet
         * Spec - https://wicg.github.io/largest-contentful-paint/
         */
        this.po.observe({ type: LARGEST_CONTENTFUL_PAINT, buffered: true })
      }
      this.po.observe({ type: LONG_TASK })
    } catch (_) {}
  }

  stop(transaction) {
    if (!isManaged(transaction)) {
      return
    }
    this.po.disconnect()
  }
}
