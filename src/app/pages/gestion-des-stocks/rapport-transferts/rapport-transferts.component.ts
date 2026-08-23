import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { TransfertStockService } from '../../../services/gestion-des-stocks/transfert-stock.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { AuthService } from '../../../services/auth/auth.service';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { filterEntrepots, isEntrepot } from '../../../helpers/boutique-type.util';

interface LigneRapport {
  produit_nom: string;
  prix_vente: number;
  qte_transferee: number;
  qte_vendue: number;
  stock_restant: number;
  ca_genere: number;
  taux_ecoulement: number;
}

@Component({
  selector: 'app-rapport-transferts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NzSelectModule],
  templateUrl: './rapport-transferts.component.html',
})
export default class RapportTransfertsComponent implements OnInit {
  private transfertService = inject(TransfertStockService);
  private boutiqueService  = inject(BoutiqueService);
  private authService      = inject(AuthService);

  boutiques:  any[] = [];
  entrepots:  any[] = [];
  lignes: LigneRapport[] = [];

  filtres = {
    boutique_destination: null as number | null,
    boutique_source:      null as number | null,
    date_debut:           '',
    date_fin:             '',
  };

  isLoading = false;
  searched  = false;
  currentUser: any;
  mobileDetailItem: LigneRapport | null = null;

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      this.loadBoutiques();
    });
  }

  loadBoutiques(): void {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    const obs = code === 'admin'
      ? this.boutiqueService.find()
      : this.boutiqueService.findByStructure(this.currentUser?.structure_id);

    obs.subscribe({
      next: (r: any) => {
        this.boutiques = r?.data ?? [];
        this.entrepots = filterEntrepots(this.boutiques);
        if (this.entrepots.length === 1) {
          this.filtres.boutique_source = this.entrepots[0].id;
        }
      },
    });
  }

  get boutiquesDestination(): any[] {
    return this.boutiques.filter((b: any) => !isEntrepot(b));
  }

  charger(): void {
    if (!this.filtres.boutique_destination) return;
    this.isLoading = true;
    this.searched  = true;

    this.transfertService.rapportVentes({
      boutique_destination: this.filtres.boutique_destination,
      boutique_source:      this.filtres.boutique_source ?? undefined,
      date_debut:           this.filtres.date_debut || undefined,
      date_fin:             this.filtres.date_fin   || undefined,
    })
    .pipe(finalize(() => (this.isLoading = false)))
    .subscribe({
      next: (r: any) => { this.lignes = r?.data ?? []; },
      error: () => { this.lignes = []; },
    });
  }

  get totaux() {
    return {
      transferee: this.lignes.reduce((s, l) => s + l.qte_transferee, 0),
      vendue:     this.lignes.reduce((s, l) => s + l.qte_vendue, 0),
      stock:      this.lignes.reduce((s, l) => s + l.stock_restant, 0),
      ca:         this.lignes.reduce((s, l) => s + l.ca_genere, 0),
    };
  }

  tauxColor(taux: number): string {
    if (taux >= 80) return 'success';
    if (taux >= 40) return 'warning';
    return 'danger';
  }

  nomBoutique(id: number | null): string {
    if (!id) return '—';
    return this.boutiques.find((b) => b.id === id)?.nom ?? '—';
  }
}
