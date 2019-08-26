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
  Router,
  Event,
  NavigationStart,
  NavigationEnd,
  NavigationError,
  ActivatedRoute
} from '@angular/router'
import { Injectable } from '@angular/core'
import { Promise } from 'es6-promise'

@Injectable({
  providedIn: 'root'
})
export class ApmService {
  static apm: any

  constructor(public router: Router) {}

  init(config) {
    ApmService.apm.init(config)

    const configService = ApmService.apm.serviceFactory.getService(
      'ConfigService'
    )
    if (!configService.isActive()) {
      const loggingService = ApmService.apm.serviceFactory.getService(
        'LoggingService'
      )
      loggingService.warn(
        `RUM agent is inactive, route-change transaction is not instrumented`
      )
      return
    }

    /**
     * Start listening to route change once we
     * intiailize to set the correct transaction names
     */
    this.observe()
  }

  observe() {
    let transaction
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationStart) {
        const name = event.url
        transaction = ApmService.apm.startTransaction(name, 'route-change', {
          canReuse: true
        })
      } else if (event instanceof NavigationError) {
        transaction && transaction.detectFinish()
      } else if (event instanceof NavigationEnd) {
        if (!transaction) {
          return
        }

        /**
         * The below logic must be placed in NavigationEnd since
         * the we depend on the current route state to get the path
         *
         * Even If there are any redirects, the router state path
         * will be matched with the correct url on navigation end
         */
        const child: ActivatedRoute = this.router.routerState.root.firstChild
        if (
          child &&
          child.snapshot.routeConfig &&
          child.snapshot.routeConfig.path
        ) {
          transaction.name = '/' + child.snapshot.routeConfig.path
        }
        /**
         * Schedule the transaction finish logic on the next
         * micro task since most of the angular components wait for
         * Observables resolution on ngInit to fetch the neccessary
         * data for mounting
         */
        Promise.resolve().then(() => transaction.detectFinish())
      }
    })
  }
}
