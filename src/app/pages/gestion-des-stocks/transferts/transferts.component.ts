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
    if (transfert) {
      this.editId = transfert.id;
      this.form = {
        boutique_source: transfert.boutique_source?.id ?? null,
        boutique_destination: transfert.boutique_destination?.id ?? null,
        notes: transfert.notes ?? '',
        lignes: (transfert.lignes ?? []).map((l: any) => ({
          produit: l.produit?.id,
          produit_nom: l.produit?.nom,
          quantite: l.quantite,
        })),
      };
    } else {
      this.editId = null;
      this.form = {
        boutique_source: this.entrepots[0]?.id ?? null,
        boutique_destination: null,
        notes: '',
        lignes: [{ produit: null, produit_nom: '', quantite: 1 }],
      };
    }
    if (this.form.boutique_source) {
      this.loadProduitsSrc(this.form.boutique_source);
    }
    const modal = document.getElementById('modalTransfert');
    if (modal) (window as any).bootstrap?.Modal?.getOrCreateInstance(modal).show();
  }

  onSourceChange(): void {
    this.form.lignes = [{ produit: null, produit_nom: '', quantite: 1 }];
    if (this.form.boutique_source) {
      this.loadProduitsSrc(this.form.boutique_source);
    }
  }

  loadProduitsSrc(boutiqueId: number): void {
    this.produitService.getProduits({ boutique: boutiqueId }).subscribe({
      next: (r: any) => { this.produitsSrc = r?.data?.items ?? r?.data ?? []; },
    });
  }

  onProduitChange(ligne: any): void {
    const p = this.produitsSrc.find((p: any) => p.id === +ligne.produit);
    ligne.produit_nom = p?.nom ?? '';
    ligne.stock_dispo = p?.stock_disponible ?? 0;
  }

  ajouterLigne(): void {
    this.form.lignes.push({ produit: null, produit_nom: '', quantite: 1 });
  }

  supprimerLigne(i: number): void {
    this.form.lignes.splice(i, 1);
  }

  sauvegarder(): void {
    if (!this.form.boutique_source) { this.erreur = 'Sélectionnez la source (entrepôt)'; return; }
    if (!this.form.boutique_destination) { this.erreur = 'Sélectionnez la boutique de destination'; return; }
    if (!this.form.lignes.length) { this.erreur = 'Ajoutez au moins une ligne'; return; }
    for (const l of this.form.lignes) {
      if (!l.produit || !l.quantite || l.quantite <= 0) {
        this.erreur = 'Toutes les lignes doivent avoir un produit et une quantité valide'; return;
      }
    }

    this.isSaving = true;
    this.erreur = null;
    const dto = {
      boutique_source: this.form.boutique_source,
      boutique_destination: this.form.boutique_destination,
      notes: this.form.notes || undefined,
      lignes: this.form.lignes.map((l: any) => ({ produit: +l.produit, quantite: +l.quantite })),
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
