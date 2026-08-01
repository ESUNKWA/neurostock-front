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
    if (!this.moduleService.hasModule('restauration')) {
      this.router.navigateByUrl('/dashboard');
      return false;
    }

    // Écran dédié restaurant (serveur, cuisine, caissier, admin restaurant)…
    const ecran = this.authService.getEcranCible();
    if (ecran.startsWith('restaurant-')) return true;

    // …ou rôle de gestion (admin / gérant / responsable de structure) qui bascule
    // ponctuellement en mode Restaurant depuis le bouton du header — même règle
    // que HeaderComponent.hasRestaurantAccess, sinon le bouton est visible mais
    // la navigation est bloquée silencieusement.
    const code = this.authService.getCurrentUser()?.profil?.code?.toLowerCase();
    if (code === 'admin' || code === 'responsable_structure' || code === 'gerant') return true;

    this.router.navigateByUrl('/dashboard');
    return false;
  }
}
