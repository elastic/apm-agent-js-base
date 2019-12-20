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

declare module '@elastic/apm-rum' {
  type Init = (options?: AgentConfigOptions) => ApmBase
  const init: Init

  class ApmBase {
    init: Init
    isEnabled(): boolean
    observe(name: TransactionEvents, callback: (tr: Transaction) => void): void
    config(options?: AgentConfigOptions): void
    setUserContext(user: UserObject): void
    setCustomContext(custom: object): void
    addLabels(labels: Labels): void
    setInitialPageLoadName(name: string): void
    startTransaction(
      name?: string | null,
      type?: string | null,
      options?: TransactionOptions
    ): Transaction | undefined
    startSpan(
      name?: string | null,
      type?: string | null,
      options?: SpanOptions
    ): Span | undefined
    getCurrentTransaction(): Transaction | undefined
    captureError(error: Error | string): void
    addFilter(fn: FilterFn): void
  }
  export { init, ApmBase as apm, ApmBase as apmBase, ApmBase }
  export default init
}

declare class BaseSpan {
  name: string
  type: string

  addLabels(labels: Labels): void
  addContext(context: object): void
  end(endTime?: number): void
  duration(): number | null
}

declare class Transaction extends BaseSpan {
  startSpan(
    name?: string | null,
    type?: string | null,
    options?: SpanOptions
  ): Span | undefined
  addTask(taskId: TaskId): TaskId
  removeTask(taskId: TaskId): void
  mark(key: string): void
  captureBreakdown(): void
  isFinished(): boolean
}

declare class Span extends BaseSpan {
  sync: boolean
}

interface AgentConfigOptions {
  serviceName?: string
  serverUrl?: string
  serviceVersion?: string
  active?: boolean
  instrument?: boolean
  disableInstrumentations?: Array<InstrumentationTypes>
  environment?: string
  logLevel?: LogLevel
  breakdownMetrics?: boolean
  flushInterval?: number
  pageLoadTraceId?: string
  pageLoadSampled?: boolean
  pageLoadSpanId?: string
  pageLoadTransactionName?: string
  distributedTracing?: boolean
  distributedTracingOrigins?: Array<string>
  errorThrottleLimit?: number
  errorThrottleInterval?: number
  transactionThrottleLimit?: number
  transactionThrottleInterval?: number
  transactionSampleRate?: number
  centralConfig?: boolean
  ignoreTransactions?: Array<string | RegExp>
}

interface TransactionOptions {
  startTime?: number
  managed?: boolean
  canReuse?: boolean
}

interface SpanOptions {
  startTime?: number
  sync: boolean
}

interface UserObject {
  id?: string | number
  username?: string
  email?: string
}

interface Labels {
  [key: string]: LabelValue
}

type FilterFn = (payload: Payload) => Payload | boolean | void
type Payload = { [key: string]: any }

type TaskId = string | number
type LabelValue = string
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error'
type TransactionEvents = 'transaction:start' | 'transaction:end'
type InstrumentationTypes =
  | 'page-load'
  | 'error'
  | 'history'
  | 'fetch'
  | 'xmlhttprequest'
