import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CaisseService } from '../../../services/gestion-des-caisses/caisse.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-rapport-caisse',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './rapport.component.html',
  styleUrl: './rapport.component.scss'
})
export default class RapportComponent implements OnInit {
  sessionId!: number;
  rapport: any = null;
  loading = true;
  error = '';

  modeLabels: Record<string, string> = {
    espece:       'Espèces',
    carte:        'Carte bancaire',
    mobile_money: 'Mobile Money',
    credit:       'Crédit',
    mixte:        'Mixte',
    cheque:       'Chèque',
    virement:     'Virement',
  };

  constructor(
    private route: ActivatedRoute,
    private caisseService: CaisseService
  ) {}

  ngOnInit(): void {
    this.sessionId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadRapport();
  }

  loadRapport(): void {
    this.loading = true;
    this.caisseService.getRapport(this.sessionId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r: any) => { this.rapport = r?.data || r; },
        error: () => { this.error = 'Impossible de charger le rapport.'; }
      });
  }

  /** Somme toutes les valeurs d'un objet par mode (espece, mobile_money, carte, credit) */
  sumModes(obj: any): number {
    if (obj == null) return 0;
    if (typeof obj === 'number') return obj;
    return Object.values(obj).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
  }

  /** Entrées par mode depuis ventes.par_mode */
  modesEntries(): { mode: string; nbre: number; total: number }[] {
    const parMode = this.rapport?.ventes?.par_mode;
    if (!parMode || typeof parMode !== 'object') return [];
    return Object.entries(parMode)
      .map(([mode, val]: [string, any]) => ({
        mode,
        nbre:  Number(val?.nbre  ?? 0),
        total: Number(val?.total ?? 0),
      }))
      .filter(e => e.total > 0);
  }

  /** Détail des mouvements manuels */
  get mouvementsDetail(): any[] {
    const m = this.rapport?.mouvements;
    return Array.isArray(m?.detail) ? m.detail : [];
  }

  get ecartTotal(): number {
    return this.sumModes(this.rapport?.recap?.ecart);
  }

  get totalEntrees(): number {
    return Number(this.rapport?.mouvements?.total_entrees ?? 0);
  }

  get totalSorties(): number {
    return Number(this.rapport?.mouvements?.total_sorties ?? 0);
  }

  /** Signe + si positif pour l'affichage de l'écart */
  ecartSign(val: number): string {
    return val >= 0 ? '+' : '';
  }

  labelMode(m: string): string {
    return this.modeLabels[m] ?? m;
  }

  print(): void {
    window.print();
  }
}
