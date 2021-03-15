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

import '@babel/polyfill'
import 'whatwg-fetch'
import React, { Suspense, lazy } from 'react'
import { render } from 'react-dom'
import { BrowserRouter, Route, Link, Redirect } from 'react-router-dom'
import MainComponent from '../components/main-component'
import TopicComponent from '../components/topic-component'
import FunctionalComponent from '../components/func-component'
import { ApmRoute } from '../../../src'
import createApmBase from '..'

const apm = createApmBase({
  logLevel: 'debug',
  serviceName: 'apm-agent-rum-general-e2e-react',
  serviceVersion: '0.0.1'
})

/**
 * Delaying the render for 70ms to capture the user timing
 * measurements in the transaction timeframe
 */
const ManualComponent = lazy(() => {
  if (typeof performance.mark === 'function') {
    performance.mark('manual-component-start')
  }
  return new Promise(resolve => {
    setTimeout(() => {
      return resolve(import('../components/manual-component'))
    }, 70)
  })
})

class App extends React.Component {
  render() {
    return (
      <div>
        <div>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link id="manual" to="/manual">
                Manual
              </Link>
            </li>
            <li>
              <Link to="/func">Functional</Link>
            </li>
            <li>
              <Link to="/topics">Topics</Link>
            </li>
            <li>
              <Link to="/topic/10">Topic 10</Link>
            </li>
          </ul>

          <hr />
          <ApmRoute
            exact
            path="/"
            render={() => (
              <Redirect
                to={{
                  pathname: '/home'
                }}
              />
            )}
          />
          <ApmRoute path="/home" component={MainComponent} />
          <ApmRoute path="/about" render={() => <div>about</div>} />
          <ApmRoute path="/func" component={FunctionalComponent} />
          <ApmRoute path="/topics" render={TopicComponent} />
          <ApmRoute path="/topic/:id">{TopicComponent}</ApmRoute>
          <Route
            path="/manual"
            component={() => (
              <Suspense fallback={<div>Loading...</div>}>
                <ManualComponent />
              </Suspense>
            )}
          />
        </div>
        <div id="test-element">Passed</div>
      </div>
    )
  }
}

const tr = apm.getCurrentTransaction()
const span = tr.startSpan('Render', 'app')

render(
  <BrowserRouter basename="/test/e2e/with-router/">
    <App />
  </BrowserRouter>,
  document.getElementById('app'),
  () => {
    span.end()
    tr.detectFinish()
  }
)
