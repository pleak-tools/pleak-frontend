import { Injectable } from '@angular/core';
import { Subject } from "rxjs";
import { Router, RouteConfigLoadStart } from '@angular/router';

@Injectable()
export class RouteService {

  constructor(private _router: Router) {
    this._router.events.subscribe(event => {
      this.setLocation(this._router, event);
      this.setCurrentUrl(event['url']);
    });
  }

  private routePageId = new Subject<string>();
  routePage = this.routePageId.asObservable();

  private routeSubPageId = new Subject<string>();
  routeSubPage = this.routeSubPageId.asObservable();

  public currentUrl;
  
  getCurrentUrl() {
    return this.currentUrl;
  }

  setCurrentUrl(url) {
    this.currentUrl = url;
  }

  setLocation(router, event) {
  
    if (event.constructor.name === 'NavigationStart') {

      if (event['url'].indexOf('/#/files') !== -1) {

        this.routeSubPageId.next('files');

      } else if (event['url'].indexOf('/#/home') !== -1) {

        this.routeSubPageId.next('home');

      } else if (event['url'].indexOf('/#/modeler/') !== -1) {

        this.routePageId.next('modeler');

      } else if (event['url'].indexOf('/#/viewer/') !== -1) {

        this.routePageId.next('viewer');

      } else if (event['url'].indexOf('/app#/view/') !== -1) {

        var modelId = event['url'].split(/\//)[3];
        router.navigateByUrl('/#/viewer/' + modelId);

      } else {

        this.routePageId.next('home');
        this.routeSubPageId.next('home');
        router.navigateByUrl('/#/home');

      }

      this.setCurrentUrl(event['url']);

    }

  }

  setPage(page: string) {
    this.routePageId.next(page);
  }

  setSubPage(page: string) {
    this.routeSubPageId.next(page);
  }

  navigateToHome() {
    this.routePageId.next('home');
    this.routeSubPageId.next('home');
    this._router.navigateByUrl('/#/home');
  }

}