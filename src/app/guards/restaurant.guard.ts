import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ModuleService } from '../services/modules/module.service';
import { AuthService } from '../services/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class RestaurantGuard implements CanActivate {
  constructor(
    private router: Router,
    private moduleService: ModuleService,
    private authService: AuthService,
  ) {}

  canActivate(): boolean {
    const ecran = this.authService.getEcranCible();
    const hasModule = this.moduleService.hasModule('restauration');
    if (ecran.startsWith('restaurant-') && hasModule) return true;
    this.router.navigateByUrl('/dashboard');
    return false;
  }
}
