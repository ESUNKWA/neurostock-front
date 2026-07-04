import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-abonnement-expire',
  standalone: true,
  template: `
    <div class="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div class="text-center p-5" style="max-width:480px">
        <div class="mb-4" style="font-size:4rem;line-height:1">🔒</div>
        <h2 class="fw-bold mb-2">Abonnement expiré</h2>
        <p class="text-muted mb-4">
          Votre abonnement a expiré ou a été suspendu. Veuillez contacter votre administrateur ou renouveler votre abonnement pour continuer à utiliser l'application.
        </p>
        <div class="d-flex flex-column gap-2 align-items-center">
          <button class="btn btn-primary px-4" (click)="contactAdmin()">
            <i class="bi bi-envelope me-2"></i>Contacter le support
          </button>
          <button class="btn btn-outline-secondary btn-sm" (click)="logout()">
            <i class="bi bi-box-arrow-right me-2"></i>Se déconnecter
          </button>
        </div>
      </div>
    </div>
  `,
})
export default class AbonnementExpireComponent {
  constructor(private authService: AuthService, private router: Router) {}

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  contactAdmin(): void {
    window.location.href = 'mailto:support@ekwatech.com';
  }
}
