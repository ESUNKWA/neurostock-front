import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ModuleService } from '../services/modules/module.service';

@Injectable({ providedIn: 'root' })
export class RestaurantGuard implements CanActivate {
  constructor(private router: Router, private moduleService: ModuleService) {}

  canActivate(): boolean {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const isRestaurant = user?.boutique?.type === 'restaurant';
    const hasModule = this.moduleService.hasModule('restauration');
    if (isRestaurant && hasModule) return true;
    this.router.navigateByUrl('/dashboard');
    return false;
  }
}
