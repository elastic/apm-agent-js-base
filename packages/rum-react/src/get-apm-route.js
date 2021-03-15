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

import React from 'react'
import { Route } from 'react-router-dom'
import { getWithTransaction } from './get-with-transaction'

/**
 * If the path/name is given as array, use the computed path
 * to get the current transaction name
 */
function getTransactionName(name, props) {
  const { match = {} } = props

  if (Array.isArray(name) && match.path) {
    return match.path
  }
  return name
}

function getApmRoute(apm) {
  const withTransaction = getWithTransaction(apm)

  return class ApmRoute extends React.Component {
    constructor(props) {
      super(props)
      this.state = {}
    }

    static getDerivedStateFromProps(nextProps, prevState) {
      const initial = prevState.apmComponent == null
      const { path, component, render, children } = nextProps
      const pathChanged = path != prevState.path

      /**
       * Should update the apmComponent state and re-render the component only on
       * initial mount and on route change.
       * Ex: Query param changes should not result in new apmComponent
       */
      if (initial || pathChanged) {
        /**
         * Route children takes precedence over component and render function
         * to keep in sync with the Route Component
         */
        return {
          render: null,
          children: null,
          component: withTransaction(
            path,
            'route-change',
            (transaction, props) => {
              if (transaction) {
                const name = getTransactionName(path, props)
                name && (transaction.name = name)
              }
            }
          )(children || component || render)
        }
      }
      return null
    }

    render() {
      return <Route {...this.props} {...this.state} />
    }
  }
}

export { getApmRoute }
