import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RestaurantGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.boutique?.type === 'restaurant') return true;
    this.router.navigateByUrl('/dashboard');
    return false;
  }
}
