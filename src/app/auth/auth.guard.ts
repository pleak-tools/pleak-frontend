import { Injectable, InjectionToken, Injector } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, ActivatedRoute } from '@angular/router';
import { Observable, of, from } from 'rxjs';

import { AuthService } from './auth.service';
import { filter, map, mergeMap, takeWhile } from 'rxjs/operators';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router, private route: ActivatedRoute, private injector: Injector) {
    authService.authStatus.subscribe(() => {
      this.getGuardChain().subscribe();
    });
  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> {

    return this.checkLogin(state.url);
  }

  checkLogin(url: string): Observable<boolean> {
    return this.authService.authStatus.pipe(
      filter(value => typeof value === 'boolean'),
      map((value) => {
        if (value === false) {
          // Store the attempted URL for redirecting
          this.authService.redirectUrl = url;

          // Navigate to the login page with extras
          this.router.navigate(['/home/login']);
        }

        return value;
      }));
  }

  recursivelyGetGuardedRoutes(route: ActivatedRoute): ActivatedRoute[] {
    const config = route.routeConfig;
    const returned = config && config.canActivate && config.canActivate.length > 0 ? [route] : [];
    return route.children
      ? returned.concat(route.children.reduce((acc, r) => acc.concat(this.recursivelyGetGuardedRoutes(r)), []))
      : returned;
  }

  getGuardChain(): Observable<any> {
    const routes = this.recursivelyGetGuardedRoutes(this.route);
    const obs = routes.reduce((acc: any[], route) => {
      return acc.concat(route.routeConfig.canActivate.map((token: InjectionToken<CanActivate>) => {
        const guard = this.injector.get(token);
        if (guard === this) {
          const value = guard.canActivate(route.snapshot, this.router.routerState.snapshot);
          return typeof value === 'boolean' ? of(value) : value;
        }
      }));
    }, []);
    // Loop through each guard whilst they return truthy

    return from(obs).pipe(
      mergeMap(o => o),
      takeWhile(v => !!v)
    );

  }

}
