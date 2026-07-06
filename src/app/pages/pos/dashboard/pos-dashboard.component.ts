import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashService } from '../../../services/dash/dash.service';
import { AuthService } from '../../../services/auth/auth.service';
import { DeviceService } from '../../../services/device/device.service';

@Component({
  selector: 'app-pos-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pos-dashboard.component.html',
  styles: [`
    .pos-dash-hero {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px;
      background: linear-gradient(135deg, #1a1d21 0%, #2d3340 100%);
      border-radius: 0 0 20px 20px;
      margin-bottom: 4px;
    }
    .pos-dash-greeting {
      font-size: 1rem;
      font-weight: 700;
      color: #fff;
    }
    .pos-dash-date {
      font-size: .75rem;
      color: rgba(255,255,255,.5);
      text-transform: capitalize;
      margin-top: 2px;
    }
    .pos-dash-cta {
      display: inline-flex;
      align-items: center;
      padding: 10px 16px;
      background: linear-gradient(135deg, #0d6efd, #0a58ca);
      color: #fff;
      font-size: .84rem;
      font-weight: 600;
      border-radius: 50px;
      text-decoration: none;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(13,110,253,.4);
      -webkit-tap-highlight-color: transparent;
    }
  `]
})
export default class PosDashboardComponent implements OnInit {
  currentUser: any;
  stats: any = null;
  isLoading = false;
  isMobile = false;
  today = new Date();

  readonly modesLabels: Record<string, string> = {
    espece:       'Espèces',
    carte:        'Carte bancaire',
    credit:       'Crédit',
    orange_money: 'Orange Money',
    wave:         'Wave',
    mtn_money:    'MTN Money',
    moov_money:   'Moov Money',
    dajmo:        'Dajmo',
  };

  constructor(
    private dashService: DashService,
    private authService: AuthService,
    private deviceSvc: DeviceService
  ) {}

  ngOnInit(): void {
    this.deviceSvc.isMobile$.subscribe(m => this.isMobile = m);
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      if (user) this.load();
    });
  }

  load(): void {
    const boutiqueId = this.currentUser?.boutique_id ?? this.currentUser?.boutique?.id;
    const caissier   = this.currentUser?.id ?? this.currentUser?.telephone;
    if (!boutiqueId || !caissier) return;

    this.isLoading = true;
    this.dashService.findCaissier(boutiqueId, caissier).subscribe({
      next: (res: any) => { this.stats = res; this.isLoading = false; },
      error: ()        => { this.stats = {};  this.isLoading = false; },
    });
  }

  modeEntries(): { label: string; val: number }[] {
    const obj = this.stats?.par_mode_paiement;
    if (!obj) return [];
    return Object.entries(obj)
      .filter(([, v]) => Number(v) > 0)
      .map(([mode, val]) => ({ label: this.modesLabels[mode] ?? mode, val: Number(val) }));
  }

  get panierMoyen(): number {
    if (!this.stats?.nb_ventes) return 0;
    return Math.round(this.stats.chiffre_affaires / this.stats.nb_ventes);
  }
}
