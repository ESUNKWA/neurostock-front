import { Component, inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { TransfertStockService } from '../../../services/gestion-des-stocks/transfert-stock.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { ProduitService } from '../../../services/gestion-des-produits/produit.service';
import { AuthService } from '../../../services/auth/auth.service';

declare var $: any;

@Component({
  selector: 'app-transferts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NzSelectModule],
  templateUrl: './transferts.component.html',
})
export default class TransfertsComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  transferts: any[]  = [];
  boutiques: any[]   = [];
  entrepots: any[]   = [];
  produitsSrc: any[] = [];
  currentUser: any;

  // Sélection produits (nouvelle UX)
  selectedMap: { [id: number]: number } = {}; // produit_id → quantite
  produitSearch = '';
  produitPage = 1;
  readonly produitPageSize = 30;

  private transfertService = inject(TransfertStockService);
  private boutiqueService  = inject(BoutiqueService);
  private produitService   = inject(ProduitService);
  private authService      = inject(AuthService);

  isLoading   = false;
  isSaving    = false;
  erreur: string | null = null;

  filterBoutiqueId: number | null = null;

  // Formulaire création/édition
  form: any = { boutique_source: null, boutique_destination: null, notes: '', lignes: [] };
  editId: number | null = null;

  // Détail modal
  detail: any = null;

  constructor() {}

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
        this.entrepots = this.boutiques.filter((b: any) => b.type === 'entrepot');
        if (this.boutiques.length === 1) {
          this.filterBoutiqueId = this.boutiques[0].id;
        }
        this.loadTransferts();
      },
    });
  }

  loadTransferts(): void {
    this.isLoading = true;
    this.destroyDt();
    const params: any = { page: 1, limit: 200 };
    if (this.filterBoutiqueId) params.boutique = this.filterBoutiqueId;

    this.transfertService.findAll(params)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (r: any) => {
          this.transferts = r?.data?.items ?? (Array.isArray(r?.data) ? r.data : []);
          setTimeout(() => this.initDt(), 100);
        },
        error: () => { this.transferts = []; },
      });
  }

  ngOnDestroy(): void { this.destroyDt(); }

  private destroyDt(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const t = $('.js-dt-transferts');
        if ($.fn?.DataTable?.isDataTable(t)) t.DataTable().destroy();
      } catch {}
    }
  }

  private initDt(): void {
    if (isPlatformBrowser(this.platformId) && this.transferts.length) {
      try {
        const t = $('.js-dt-transferts');
        if (!$.fn?.DataTable?.isDataTable(t)) {
          t.DataTable({ pageLength: 20, order: [[0, 'desc']], language: { url: 'assets/i18n/fr-FR.json' } });
        }
      } catch {}
    }
  }

  // ---- Formulaire ----

  ouvrirFormulaire(transfert?: any): void {
    this.erreur = null;
    this.produitSearch = '';
    this.produitPage = 1;
    this.produitsSrc = [];

    if (transfert) {
      this.editId = transfert.id;
      const lignes: any[] = transfert.lignes ?? [];
      this.form = {
        boutique_source: transfert.boutique_source?.id ?? null,
        boutique_destination: transfert.boutique_destination?.id ?? null,
        notes: transfert.notes ?? '',
      };
      // Pré-cocher les produits des lignes existantes
      this.selectedMap = {};
      for (const l of lignes) {
        if (l.produit?.id) this.selectedMap[l.produit.id] = l.quantite;
      }
      if (this.form.boutique_source) {
        this.loadProduitsSrc(this.form.boutique_source, lignes);
      }
    } else {
      this.editId = null;
      this.selectedMap = {};
      this.form = {
        boutique_source: this.entrepots[0]?.id ?? null,
        boutique_destination: null,
        notes: '',
      };
      if (this.form.boutique_source) {
        this.loadProduitsSrc(this.form.boutique_source);
      }
    }
    const modal = document.getElementById('modalTransfert');
    if (modal) (window as any).bootstrap?.Modal?.getOrCreateInstance(modal).show();
  }

  onSourceChange(): void {
    this.selectedMap = {};
    this.produitSearch = '';
    this.produitPage = 1;
    this.produitsSrc = [];
    if (this.form.boutique_source) {
      this.loadProduitsSrc(this.form.boutique_source);
    }
  }

  loadProduitsSrc(boutiqueId: number, existingLignes?: any[]): void {
    this.produitService.getProduits({ boutique: boutiqueId }).subscribe({
      next: (r: any) => {
        this.produitsSrc = r?.data?.items ?? r?.data ?? [];
        // En mode édition, garantir la présence des produits déjà sélectionnés
        // (certains peuvent avoir stock=0 et être filtrés par le backend)
        if (existingLignes?.length) {
          for (const l of existingLignes) {
            const pid = l.produit?.id;
            if (pid && !this.produitsSrc.find((p: any) => p.id === pid)) {
              this.produitsSrc.push({
                id: pid,
                nom: l.produit?.nom ?? `Produit #${pid}`,
                reference: l.produit?.reference ?? '',
                stock_disponible: 0,
              });
            }
          }
        }
      },
    });
  }

  // ---- Sélection produits (table avec cases à cocher) ----

  get filteredProduits(): any[] {
    const q = this.produitSearch.trim().toLowerCase();
    if (!q) return this.produitsSrc;
    return this.produitsSrc.filter((p: any) =>
      (p.nom ?? '').toLowerCase().includes(q) ||
      (p.reference ?? '').toLowerCase().includes(q)
    );
  }

  get totalProduitPages(): number {
    return Math.max(1, Math.ceil(this.filteredProduits.length / this.produitPageSize));
  }

  get pagedProduits(): any[] {
    const start = (this.produitPage - 1) * this.produitPageSize;
    return this.filteredProduits.slice(start, start + this.produitPageSize);
  }

  get produitPages(): number[] {
    return Array.from({ length: this.totalProduitPages }, (_, i) => i + 1);
  }

  onProduitSearchChange(): void {
    this.produitPage = 1;
  }

  get selectedCount(): number {
    return Object.keys(this.selectedMap).length;
  }

  get allFilteredSelected(): boolean {
    return this.filteredProduits.length > 0 &&
           this.filteredProduits.every(p => !!this.selectedMap[p.id]);
  }

  isSelected(id: number): boolean {
    return !!this.selectedMap[id];
  }

  toggleProduit(p: any): void {
    if (this.selectedMap[p.id]) {
      delete this.selectedMap[p.id];
    } else {
      this.selectedMap[p.id] = 1;
    }
  }

  getQty(id: number): number {
    return this.selectedMap[id] ?? 1;
  }

  setQty(id: number, event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && val > 0) {
      this.selectedMap[id] = val;
    }
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    for (const p of this.filteredProduits) {
      if (checked) {
        if (!this.selectedMap[p.id]) this.selectedMap[p.id] = 1;
      } else {
        delete this.selectedMap[p.id];
      }
    }
  }

  sauvegarder(): void {
    if (!this.form.boutique_source) { this.erreur = 'Sélectionnez la source (entrepôt)'; return; }
    if (!this.form.boutique_destination) { this.erreur = 'Sélectionnez la boutique de destination'; return; }
    const selectedEntries = Object.entries(this.selectedMap).filter(([, qty]) => +qty > 0);
    if (selectedEntries.length === 0) { this.erreur = 'Cochez au moins un produit dans la liste'; return; }

    this.isSaving = true;
    this.erreur = null;
    const dto = {
      boutique_source: this.form.boutique_source,
      boutique_destination: this.form.boutique_destination,
      notes: this.form.notes || undefined,
      lignes: selectedEntries.map(([id, qty]) => ({ produit: +id, quantite: +qty })),
    };

    const obs = this.editId
      ? this.transfertService.update(this.editId, dto)
      : this.transfertService.create(dto);

    obs.pipe(finalize(() => (this.isSaving = false))).subscribe({
      next: () => {
        this.fermerModal('modalTransfert');
        Swal.fire({ icon: 'success', title: this.editId ? 'Transfert mis à jour' : 'Transfert créé', timer: 2000, showConfirmButton: false });
        this.loadTransferts();
      },
      error: (e: any) => { this.erreur = e?.error?.message || 'Erreur lors de la sauvegarde'; },
    });
  }

  // ---- Actions statut ----

  valider(t: any): void {
    Swal.fire({
      title: 'Expédier le transfert ?',
      text: `${t.reference} — le stock de l'entrepôt sera débité.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Expédier',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#f59e0b',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.transfertService.valider(t.id).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Transfert expédié', text: `${t.reference} a été expédié avec succès.`, timer: 2500, showConfirmButton: false });
          this.loadTransferts();
        },
        error: (e: any) => Swal.fire({ icon: 'error', title: 'Erreur', text: e?.error?.message || 'Erreur lors de la validation' }),
      });
    });
  }

  recevoir(t: any): void {
    Swal.fire({
      title: 'Réceptionner le transfert ?',
      text: `${t.reference} — le stock de la boutique de destination sera crédité.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Réceptionner',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#10b981',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.transfertService.recevoir(t.id).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Transfert réceptionné', text: `${t.reference} a été réceptionné avec succès.`, timer: 2500, showConfirmButton: false });
          this.loadTransferts();
        },
        error: (e: any) => Swal.fire({ icon: 'error', title: 'Erreur', text: e?.error?.message || 'Erreur lors de la réception' }),
      });
    });
  }

  supprimer(t: any): void {
    Swal.fire({
      title: 'Supprimer ce transfert ?',
      text: `${t.reference} sera supprimé définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.transfertService.remove(t.id).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Supprimé', text: `${t.reference} a été supprimé.`, timer: 2000, showConfirmButton: false });
          this.loadTransferts();
        },
        error: (e: any) => Swal.fire({ icon: 'error', title: 'Erreur', text: e?.error?.message || 'Erreur lors de la suppression' }),
      });
    });
  }

  voirDetail(t: any): void {
    this.detail = t;
    const modal = document.getElementById('modalDetail');
    if (modal) (window as any).bootstrap?.Modal?.getOrCreateInstance(modal).show();
  }

  // ---- Helpers ----

  statutBadge(s: string): string {
    return s === 'brouillon' ? 'secondary' : s === 'valide' ? 'warning' : 'success';
  }

  statutLabel(s: string): string {
    return s === 'brouillon' ? 'Brouillon' : s === 'valide' ? 'Expédié' : 'Réceptionné';
  }

  statutIcon(s: string): string {
    return s === 'brouillon' ? 'bi-pencil-square' : s === 'valide' ? 'bi-send' : 'bi-check2-circle';
  }

  totalLignes(t: any): number {
    return (t.lignes ?? []).reduce((s: number, l: any) => s + (l.quantite || 0), 0);
  }

  get boutiquesDestination(): any[] {
    return this.boutiques.filter((b: any) => b.type !== 'entrepot' && b.id !== this.form.boutique_source);
  }

  private fermerModal(id: string): void {
    const modal = document.getElementById(id);
    if (modal) (window as any).bootstrap?.Modal?.getInstance(modal)?.hide();
  }
}
