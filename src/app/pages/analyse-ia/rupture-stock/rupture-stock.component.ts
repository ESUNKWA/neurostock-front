import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PrevisionService } from '../../../services/analyse-ia/prevision.service';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';

interface PrevisionItem {
  produit: { id: number; nom: string; categorie: string; unite_mesure: string };
  stock_actuel: number;
  seuil_alert: number;
  consommation_journaliere: number;
  jours_restants: number;
  date_rupture_estimee: string;
  statut: 'critique' | 'alerte' | 'attention' | 'ok' | 'inactif';
  qte_a_commander: number;
}

@Component({
  selector: 'app-rupture-stock',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './rupture-stock.component.html',
  styleUrl: './rupture-stock.component.scss',
})
export default class RuptureStockComponent implements OnInit {
  private previsionService = inject(PrevisionService);
  private authService = inject(AuthService);
  private boutiqueService = inject(BoutiqueService);

  currentUser: any;
  previsions: PrevisionItem[] = [];
  isLoading = false;
  jours = 30;
  joursOptions = [7, 14, 30, 60, 90];
  filtreStatut: string = 'tous';

  boutiques: any[] = [];
  idBoutique: number = 0;

  get isAdmin(): boolean {
    const code = this.currentUser?.profil?.code;
    return code === 'admin' || code === 'responsable_structure';
  }

  get boutiqueId(): number {
    return this.isAdmin ? this.idBoutique : (this.currentUser?.boutique_id ?? 0);
  }

  readonly statutConfig: Record<string, { label: string; badge: string; icon: string; ordre: number }> = {
    critique:  { label: 'Critique',  badge: 'danger',   icon: 'bi-exclamation-octagon-fill', ordre: 1 },
    alerte:    { label: 'Alerte',    badge: 'warning',  icon: 'bi-exclamation-triangle-fill', ordre: 2 },
    attention: { label: 'Attention', badge: 'info',     icon: 'bi-exclamation-circle-fill',  ordre: 3 },
    ok:        { label: 'OK',        badge: 'success',  icon: 'bi-check-circle-fill',         ordre: 4 },
    inactif:   { label: 'Inactif',   badge: 'secondary',icon: 'bi-dash-circle-fill',          ordre: 5 },
  };

  get previsionsFiltrees(): PrevisionItem[] {
    if (this.filtreStatut === 'tous') return this.previsions;
    return this.previsions.filter(p => p.statut === this.filtreStatut);
  }

  get compteurs(): Record<string, number> {
    return this.previsions.reduce((acc, p) => {
      acc[p.statut] = (acc[p.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  get totalCritiques(): number { return (this.compteurs['critique'] || 0) + (this.compteurs['alerte'] || 0); }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      this.loadBoutiques();
      if (!this.isAdmin) {
        this.charger();
      }
    });
  }

  loadBoutiques(): void {
    if (!this.isAdmin) return;
    const code = this.currentUser?.profil?.code;
    if (code === 'admin') {
      this.boutiqueService.find().subscribe({
        next: (response: any) => {
          if (response.status === 'success' && response.data) {
            this.boutiques = response.data;
          }
        }
      });
    } else {
      // responsable_structure : boutiques déjà dans le profil utilisateur
      this.boutiques = this.currentUser.boutiques ?? [];
    }
  }

  onBoutiqueChange(): void {
    this.charger();
  }

  charger(): void {
    if (!this.boutiqueId) return;

    this.isLoading = true;
    this.previsions = [];
    this.previsionService.getRuptureStock(this.boutiqueId, this.jours).subscribe({
      next: (r: any) => {
        this.previsions = Array.isArray(r) ? r : (r?.data ?? []);
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  onJoursChange(): void {
    this.charger();
  }

  statutDe(p: PrevisionItem) {
    return this.statutConfig[p.statut] ?? this.statutConfig['inactif'];
  }

  jourRestantsLabel(n: number): string {
    if (n <= 0) return 'Rupture imminente';
    if (n === 1) return '1 jour';
    return `${n} jours`;
  }
}
