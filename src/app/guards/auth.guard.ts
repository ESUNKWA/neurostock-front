import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return false;
    }

    const user = this.authService.getUser();
    const isChangePwdRoute = state.url.startsWith('/change-password');

    if (user?.must_change_password && !isChangePwdRoute) {
      this.router.navigateByUrl('/change-password');
      return false;
    }

    const ecran = this.authService.getEcranCible();
    if (!ecran && !isChangePwdRoute) {
      this.router.navigateByUrl('/no-access');
      return false;
    }

    return true;
  }
} 