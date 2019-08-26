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

import '../polyfills'
import 'zone.js/dist/zone-testing'
import { ApmService } from '../../src/apm.service'
import { TestBed, ComponentFixture } from '@angular/core/testing'
import { RouterTestingModule } from '@angular/router/testing'
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing'
import { Component } from '@angular/core'
import { Location } from '@angular/common'
import { Routes, Router } from '@angular/router'
import { apm } from '@elastic/apm-rum'

@Component({
  template: 'Home'
})
class HomeComponent {}

@Component({
  template: 'Slug'
})
class SlugComponent {}

@Component({
  template: '<router-outlet></router-outlet>'
})
class AppComponent {}

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'slug/:id', component: SlugComponent }
]

describe('ApmService', () => {
  let service: ApmService
  let router: Router
  let location: Location
  let fixture: ComponentFixture<AppComponent>
  let compiled: HTMLElement

  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting()
  )
  ApmService.apm = apm

  function setUpAppModule() {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes(routes)],
      declarations: [HomeComponent, AppComponent, SlugComponent],
      providers: [ApmService]
    })
    service = TestBed.get(ApmService)
    router = TestBed.get(Router)
    location = TestBed.get(Location)
    /**
     * Inject router manually
     */
    service.router = router

    fixture = TestBed.createComponent(AppComponent)
    compiled = fixture.debugElement.nativeElement
  }

  function setUpRouteNavigation() {
    fixture.ngZone.run(() => router.initialNavigation())
  }

  afterEach(() => {
    apm.startTransaction.calls.reset()
  })

  describe('testing init', () => {
    beforeEach(() => {
      setUpAppModule()
      setUpRouteNavigation()
    })

    it('should log warning when agent is inactive', done => {
      const loggingService = ApmService.apm.serviceFactory.getService(
        'LoggingService'
      )
      spyOn(loggingService, 'warn')
      spyOn(apm, 'startTransaction')
      service.init({
        active: false
      })
      expect(loggingService.warn).toHaveBeenCalledWith(
        'RUM agent is inactive, route-change transaction is not instrumented'
      )
      loggingService.warn.calls.reset()

      fixture.ngZone.run(() => {
        router.navigate(['/home']).then(() => {
          expect(location.path()).toBe('/home')
          expect(compiled.querySelector('ng-component').textContent).toBe(
            'Home'
          )
          expect(apm.startTransaction).not.toHaveBeenCalled()
          done()
        })
      })
    })
  })

  describe('testing observe', () => {
    beforeEach(() => {
      setUpAppModule()
      service.observe()
      setUpRouteNavigation()
    })

    it('navigate to "/home" should create /home transaction', done => {
      spyOn(apm, 'startTransaction')
      fixture.ngZone.run(() => {
        router.navigate(['/home']).then(() => {
          expect(location.path()).toBe('/home')
          expect(compiled.querySelector('ng-component').textContent).toBe(
            'Home'
          )
          expect(apm.startTransaction).toHaveBeenCalledWith(
            '/home',
            'route-change',
            {
              canReuse: true
            }
          )
          done()
        })
      })
    })

    it('should set transaction name properly on redirects', done => {
      spyOn(apm, 'startTransaction').and.callThrough()
      const tr = apm.getCurrentTransaction()
      fixture.ngZone.run(() => {
        router.navigate(['/']).then(() => {
          expect(location.path()).toBe('/home')
          expect(compiled.querySelector('ng-component').textContent).toBe(
            'Home'
          )
          expect(apm.startTransaction).toHaveBeenCalledWith(
            '/',
            'route-change',
            {
              canReuse: true
            }
          )
          expect(tr.name).toEqual('/home')

          done()
        })
      })
    })

    it('should set transaction name properly on parameterised urls', done => {
      spyOn(apm, 'startTransaction').and.callThrough()
      const tr = apm.getCurrentTransaction()
      fixture.ngZone.run(() => {
        router.navigate(['/slug/2']).then(() => {
          expect(location.path()).toBe('/slug/2')
          expect(compiled.querySelector('ng-component').textContent).toBe(
            'Slug'
          )
          expect(apm.startTransaction).toHaveBeenCalledWith(
            '/slug/2',
            'route-change',
            {
              canReuse: true
            }
          )
          expect(tr.name).toEqual('/slug/:id')

          done()
        })
      })
    })
  })
})