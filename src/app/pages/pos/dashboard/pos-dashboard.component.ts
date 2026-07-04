import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashService } from '../../../services/dash/dash.service';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-pos-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pos-dashboard.component.html',
})
export default class PosDashboardComponent implements OnInit {
  currentUser: any;
  stats: any = null;
  isLoading = false;
  today = new Date();

  readonly modesLabels: Record<string, string> = {
    espece: 'Espèces',
    mobile_money: 'Mobile Money',
    carte: 'Carte bancaire',
    credit: 'Crédit',
  };

  constructor(
    private dashService: DashService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
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
