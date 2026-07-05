import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-abonnement-banner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (banner) {
      <div class="abonnement-banner alert mb-0 rounded-0 py-2 px-4 d-flex align-items-center gap-2 border-0 border-bottom"
           [class.alert-danger]="banner.level === 'danger'"
           [class.alert-warning]="banner.level === 'warning'"
           [class.alert-info]="banner.level === 'info'">
        <i class="bi {{ banner.icon }} flex-shrink-0"></i>
        <span class="small fw-semibold">{{ banner.message }}</span>
        <a routerLink="/mon-abonnement" class="btn btn-sm ms-2"
           [class.btn-outline-danger]="banner.level === 'danger'"
           [class.btn-outline-warning]="banner.level === 'warning'"
           [class.btn-outline-info]="banner.level === 'info'"
           style="font-size:.75rem;padding:.15rem .5rem">
          Voir mon abonnement
        </a>
      </div>
    }
  `,
  styles: [`.abonnement-banner { font-size: .85rem; }`]
})
export class AbonnementBannerComponent implements OnInit, OnDestroy {
  banner: { level: 'danger' | 'warning' | 'info'; icon: string; message: string } | null = null;
  private sub?: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (!user?.structure_id) return;

    this.sub = this.authService.abonnement$.subscribe(ab => this.updateBanner(ab));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private updateBanner(ab: any): void {
    if (!ab) { this.banner = null; return; }

    const j = ab.jours_restants ?? 0;

    if (ab.statut === 'en_attente') {
      this.banner = { level: 'warning', icon: 'bi-hourglass-split', message: 'Votre renouvellement est en attente de validation par l\'administrateur.' };
    } else if (ab.statut === 'expire') {
      this.banner = { level: 'danger', icon: 'bi-exclamation-octagon-fill', message: 'Abonnement expiré. Contactez votre administrateur.' };
    } else if (ab.statut === 'suspendu') {
      this.banner = { level: 'danger', icon: 'bi-slash-circle-fill', message: 'Accès suspendu. Contactez votre administrateur.' };
    } else if (j <= 3) {
      this.banner = { level: 'danger', icon: 'bi-alarm-fill', message: `Abonnement expire dans ${j} jour${j > 1 ? 's' : ''} !` };
    } else if (j <= 7) {
      this.banner = { level: 'warning', icon: 'bi-exclamation-triangle-fill', message: `Abonnement expire dans ${j} jours.` };
    } else if (ab.plan === 'essai') {
      this.banner = { level: 'info', icon: 'bi-info-circle-fill', message: `Période d'essai — ${j} jours restants` };
    } else {
      this.banner = null;
    }
  }
}
