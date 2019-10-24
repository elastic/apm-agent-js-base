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

import '../polyfill'
import { createLocalVue, mount } from '@vue/test-utils'
import VueRouter from 'vue-router'
import { ApmBase } from '@elastic/apm-rum'
import { createServiceFactory } from '@elastic/apm-rum-core'
import { ApmVuePlugin } from '../../src'

describe('APM route hooks', () => {
  let apm

  beforeEach(() => {
    apm = new ApmBase(createServiceFactory(), false)
  })

  const App = {
    name: 'App',
    template: `<div id="app"><router-view /></div>`
  }
  const Home = {
    name: 'Home',
    template: `<div>Home Component</div>`
  }
  const Parent = {
    template: `
      <div class="parent">
        <router-view class="child"></router-view>
      </div>
    `
  }
  const Foo = { template: '<div>foo</div>' }

  function mountApp(routes) {
    const localVue = createLocalVue()
    localVue.use(VueRouter)
    const router = new VueRouter({
      mode: 'history',
      routes
    })
    localVue.use(ApmVuePlugin, {
      router,
      apm,
      config: {
        serviceName: 'test'
      }
    })
    const wrapper = mount(App, {
      router,
      localVue
    })
    return { router, wrapper }
  }

  it('should start the transaction with correct name on navigation', () => {
    const { router, wrapper } = mountApp([
      {
        path: '/',
        redirect: '/home'
      },
      {
        path: '/home',
        component: Home
      }
    ])
    spyOn(apm, 'startTransaction')
    router.push('/')

    expect(apm.startTransaction).toHaveBeenCalledWith('/home', 'route-change', {
      managed: true,
      canReuse: true
    })
    expect(wrapper.find(Home).exists()).toBe(true)
    wrapper.destroy()
  })

  it('should use the slug id for transaction name', () => {
    const { router, wrapper } = mountApp([
      {
        path: '/foo/:id',
        component: Foo
      }
    ])
    spyOn(apm, 'startTransaction')
    router.push('/foo/1')

    expect(apm.startTransaction).toHaveBeenCalledWith(
      '/foo/:id',
      'route-change',
      {
        managed: true,
        canReuse: true
      }
    )
    expect(wrapper.find(Foo).exists()).toBe(true)
    wrapper.destroy()
  })

  it('should use the slug id for nested child routes', () => {
    const { router, wrapper } = mountApp([
      {
        path: '/parent',
        component: Parent,
        children: [
          {
            path: 'foo/:fooId',
            component: Foo
          }
        ]
      }
    ])
    spyOn(apm, 'startTransaction')
    router.push('/parent/foo/1')

    expect(apm.startTransaction).toHaveBeenCalledWith(
      '/parent/foo/:fooId',
      'route-change',
      {
        managed: true,
        canReuse: true
      }
    )
    expect(wrapper.find(Foo).exists()).toBe(true)
    wrapper.destroy()
  })

  it('should expose the $apm on the vue instance', () => {
    const { wrapper } = mountApp([])
    expect(wrapper.vm.$apm).toEqual(apm)
  })
})