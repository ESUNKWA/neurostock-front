import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-no-access',
  standalone: true,
  template: `
    <div class="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div class="text-center p-5" style="max-width:500px">
        <div class="mb-4" style="font-size:4rem;line-height:1">⚠️</div>
        <h2 class="fw-bold mb-2">Accès non configuré</h2>
        <p class="text-muted mb-1">
          Votre compte n'est pas encore associé à un profil d'accès.
        </p>
        <p class="text-muted mb-4">
          Veuillez contacter votre responsable ou l'administrateur afin qu'il configure votre profil avant de pouvoir utiliser l'application.
        </p>
        <div class="d-flex flex-column gap-2 align-items-center">
          <button class="btn btn-outline-secondary btn-sm" (click)="logout()">
            <i class="bi bi-box-arrow-right me-2"></i>Se déconnecter
          </button>
        </div>
      </div>
    </div>
  `,
})
export default class NoAccessComponent {
  constructor(private authService: AuthService, private router: Router) {}

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
