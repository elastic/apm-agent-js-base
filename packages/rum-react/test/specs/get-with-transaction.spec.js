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

import Enzyme, { mount } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import React from 'react'

Enzyme.configure({ adapter: new Adapter() })

import { getWithTransaction } from '../../src/get-with-transaction'
import { ApmBase } from '@elastic/apm-rum'
import { createServiceFactory, afterFrame } from '@elastic/apm-rum-core'
import { getGlobalConfig } from '../../../../dev-utils/test-config'

function TestComponent(apm, cb) {
  const withTransaction = getWithTransaction(apm)
  function Component(props) {
    return <h1>Testing, {props.name}</h1>
  }
  const WrappedComponent = withTransaction(
    'test-transaction',
    'test-type',
    cb
  )(Component)
  expect(typeof WrappedComponent).toBe('function')
  const wrapped = mount(<WrappedComponent name="withTransaction" />)

  let text = wrapped.find('h1').text()
  expect(text).toBe('Testing, withTransaction')
  return wrapped
}

describe('withTransaction', function() {
  const { serverUrl, serviceName } = getGlobalConfig().agentConfig
  let apmBase, serviceFactory

  beforeEach(() => {
    serviceFactory = createServiceFactory()
    apmBase = new ApmBase(serviceFactory, false)
    apmBase.init({
      active: true,
      serverUrl,
      serviceName,
      disableInstrumentations: ['page-load', 'error']
    })
  })

  it('should work if apm is disabled or not initialized', function() {
    TestComponent(new ApmBase(serviceFactory, true))
    TestComponent(apmBase)
  })

  it('should not log warning or create transaction if apm is not active', function() {
    const [loggingService, transactionService] = serviceFactory.getService([
      'LoggingService',
      'TransactionService'
    ])
    spyOn(loggingService, 'warn')
    spyOn(transactionService, 'startTransaction')

    const notInitializedAPM = new ApmBase(serviceFactory, false)
    const withTransaction = getWithTransaction(notInitializedAPM)
    const testComponent = {}
    const comp = withTransaction('test-name', 'test-type')(testComponent)
    expect(comp).toEqual(testComponent)
    expect(loggingService.warn).not.toHaveBeenCalled()
    expect(transactionService.startTransaction).not.toHaveBeenCalled()
  })

  it('should start transaction for components', function() {
    const transactionService = serviceFactory.getService('TransactionService')
    spyOn(transactionService, 'startTransaction')

    TestComponent(apmBase)
    expect(transactionService.startTransaction).toHaveBeenCalledWith(
      'test-transaction',
      'test-type',
      {
        canReuse: true,
        managed: true
      }
    )
  })

  it('should return WrappedComponent on falsy value and log warning', function() {
    const loggingService = serviceFactory.getService('LoggingService')
    spyOn(loggingService, 'warn')

    const withTransaction = getWithTransaction(apmBase)
    const comp = withTransaction('test-name', 'test-type')(undefined)
    expect(comp).toBe(undefined)
    expect(loggingService.warn).toHaveBeenCalledWith(
      'test-name is not instrumented by the agent'
    )
  })

  it('should not instrument the route when rum is inactive', () => {
    const transactionService = serviceFactory.getService('TransactionService')
    spyOn(transactionService, 'startTransaction')

    apmBase.config({ active: false })
    TestComponent(apmBase)

    function Component() {
      return <h2>Component</h2>
    }
    const withTransaction = getWithTransaction(apmBase)

    const WrappedComponent = withTransaction(
      'test-transaction',
      'test-type'
    )(Component)
    expect(WrappedComponent).toEqual(Component)
    expect(transactionService.startTransaction).not.toHaveBeenCalled()
  })

  it('should not create new transaction on every render', () => {
    const transactionService = serviceFactory.getService('TransactionService')
    spyOn(transactionService, 'startTransaction')

    const wrapper = TestComponent(apmBase)
    expect(transactionService.startTransaction).toHaveBeenCalledWith(
      'test-transaction',
      'test-type',
      {
        canReuse: true,
        managed: true
      }
    )
    transactionService.startTransaction.calls.reset()
    /**
     * Trigger rerender of component
     */
    wrapper
      .setProps({
        name: 'new-props'
      })
      .update()

    expect(transactionService.startTransaction).not.toHaveBeenCalled()
    expect(wrapper.text()).toBe('Testing, new-props')
  })

  it('should accept callback function for withTransaction', () => {
    const transactionService = serviceFactory.getService('TransactionService')
    const labels = {
      foo: 'bar'
    }
    TestComponent(apmBase, tr => {
      tr.name = 'name-changed'
      tr.addLabels(labels)
    })
    const transaction = transactionService.getCurrentTransaction()
    expect(transaction.name).toBe('name-changed')
    expect(transaction.context.tags).toEqual(labels)
  })

  it('should end transaction when component unmounts', done => {
    const transactionService = serviceFactory.getService('TransactionService')
    const detectFinishSpy = jasmine.createSpy('detectFinish')
    spyOn(transactionService, 'startTransaction').and.returnValue({
      detectFinish: detectFinishSpy
    })

    const wrapper = TestComponent(apmBase)
    expect(transactionService.startTransaction).toHaveBeenCalledWith(
      'test-transaction',
      'test-type',
      {
        canReuse: true,
        managed: true
      }
    )
    afterFrame(() => {
      expect(detectFinishSpy).toHaveBeenCalled()
      wrapper.unmount()
      expect(detectFinishSpy).toHaveBeenCalled()
      done()
    })
  })
})
