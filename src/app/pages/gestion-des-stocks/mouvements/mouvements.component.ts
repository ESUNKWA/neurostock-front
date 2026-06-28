import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { StockMouvementService } from '../../../services/gestion-des-stocks/stock-mouvement.service';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-mouvements',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NzSelectModule],
  templateUrl: './mouvements.component.html',
  styleUrl: './mouvements.component.scss'
})
export default class MouvementsComponent implements OnInit {
  mouvements: any[] = [];
  boutiques: any[] = [];
  currentUser: any;
  selectedBoutiqueId: number | null = null;
  isLoading = false;

  page       = 1;
  limit      = 30;
  total      = 0;
  totalPages = 1;

  readonly limitOptions = [15, 30, 50, 100];

  constructor(
    private stockService: StockMouvementService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      this.loadBoutiques();
      const code = user?.profil?.code?.toLowerCase();
      if (code !== 'admin' && code !== 'responsable_structure') {
        this.selectedBoutiqueId = user?.boutique?.id ?? null;
        this.loadMouvements();
      }
    });
  }

  loadBoutiques(): void {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    if (code === 'admin') {
      this.boutiqueService.find().subscribe({
        next: (r: any) => { this.boutiques = r?.data ?? []; }
      });
    } else if (code === 'responsable_structure') {
      this.boutiqueService.findByStructure(this.currentUser.structure.id).subscribe({
        next: (r: any) => { this.boutiques = r?.data ?? []; }
      });
    } else {
      this.boutiques = this.currentUser?.boutique ? [this.currentUser.boutique] : [];
    }
  }

  onBoutiqueChange(): void {
    this.page = 1;
    this.loadMouvements();
  }

  onLimitChange(): void {
    this.page = 1;
    this.loadMouvements();
  }

  loadMouvements(): void {
    if (!this.selectedBoutiqueId) { this.mouvements = []; return; }
    this.isLoading = true;
    this.stockService.getMouvements({ boutique: this.selectedBoutiqueId, page: this.page, limit: this.limit })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (r: any) => {
          this.mouvements = r?.data ?? [];
          this.total      = r?.pagination?.total      ?? 0;
          this.totalPages = r?.pagination?.totalPages ?? 1;
        },
        error: () => { this.mouvements = []; }
      });
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.loadMouvements();
  }

  get pages(): number[] {
    const start = Math.max(1, this.page - 2);
    const end   = Math.min(this.totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  reference(m: any): string {
    return m.vente?.reference || m.achat?.reference || '—';
  }

  operateur(m: any): string {
    const u = m.utilisateur;
    if (!u) return '—';
    return `${u.prenoms || ''} ${u.nom || ''}`.trim();
  }
}
