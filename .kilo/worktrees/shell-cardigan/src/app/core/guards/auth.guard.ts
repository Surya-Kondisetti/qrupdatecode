import { Injectable } from '@angular/core';
import {
  CanActivate, CanLoad,
  ActivatedRouteSnapshot, RouterStateSnapshot,
  Route, Router
} from '@angular/router';
import { Observable } from 'rxjs';
import { map, filter, take } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanLoad {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.checkAuth(state.url);
  }

  canLoad(route: Route): Observable<boolean> {
    return this.checkAuth(route.path ?? '/');
  }

  private checkAuth(url: string): Observable<boolean> {
    return this.auth.loading$.pipe(
      filter(loading => !loading),
      take(1),
      map((_) => {
        if (this.auth.isAuthenticated) return true;
        this.router.navigate(['/login'], { queryParams: { returnUrl: url } });
        return false;
      })
    );
  }
}

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const allowedRoles = route.data?.['roles'] as string[] ?? [];
    return this.auth.loading$.pipe(
      filter(loading => !loading),
      take(1),
      map(() => {
        if (!this.auth.isAuthenticated) {
          this.router.navigate(['/login']);
          return false;
        }
        if (allowedRoles.length && !allowedRoles.includes(this.auth.role!)) {
          this.auth.redirectByRole();
          return false;
        }
        return true;
      })
    );
  }
}

@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.auth.loading$.pipe(
      filter(loading => !loading),
      take(1),
      map(() => {
        if (this.auth.isAuthenticated) {
          this.auth.redirectByRole();
          return false;
        }
        return true;
      })
    );
  }
}
