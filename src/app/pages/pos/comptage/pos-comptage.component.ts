import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../services/auth/auth.service';
import { ProduitService } from '../../../services/gestion-des-produits/produit.service';
import { VentesService } from '../../../services/gestion-des-ventes/ventes.service';
import { CaisseService } from '../../../services/gestion-des-caisses/caisse.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';

interface LigneComptage {
  produit: any;
  quantite_restante: number | null;
  prix_unitaire_vente: number;
}

@Component({
  selector: 'app-pos-comptage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pos-comptage.component.html',
  providers: [ToastrService],
})
export default class PosComptageComponent implements OnInit {
  currentUser: any;

  loading = false;
  isSubmitting = false;
  searchQuery = '';

  lignes: LigneComptage[] = [];
  filtered: LigneComptage[] = [];

  // Caisse
  caisseActivee = false;
  activeSessionId: number | null = null;

  // Paiement
  private readonly MODES = [
    { value: 'espece', label: 'Espèces', icon: 'bi-cash' },
    { value: 'orange_money', label: 'Orange Money', icon: 'bi-phone' },
    { value: 'wave', label: 'Wave', icon: 'bi-phone' },
    { value: 'mtn_money', label: 'MTN Money', icon: 'bi-phone' },
    { value: 'moov_money', label: 'Moov Money', icon: 'bi-phone' },
    { value: 'dajmo', label: 'Dajmo', icon: 'bi-phone' },
    { value: 'carte', label: 'Carte', icon: 'bi-credit-card' },
  ];
  modesPaiementActifs: string[] | null = null;

  get modes() {
    if (!this.modesPaiementActifs) return this.MODES;
    return this.MODES.filter(m => this.modesPaiementActifs!.includes(m.value));
  }

  modePaiement = 'espece';
  montantRecu: number | null = null;

  result: any = null;

  constructor(
    private authService: AuthService,
    private produitSvc: ProduitService,
    private ventesSvc: VentesService,
    private caisseSvc: CaisseService,
    private boutiqueSvc: BoutiqueService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      if (u) {
        this.loadProduits();
        this.loadCaisse();
      }
    });
  }

  get boutiqueId(): number | null {
    return this.currentUser?.boutique_id ?? this.currentUser?.boutique?.id ?? null;
  }

  // ── Produits ────────────────────────────────────────────────────────────

  loadProduits(): void {
    if (!this.boutiqueId) return;
    this.loading = true;
    this.produitSvc.getProduits({ boutique: this.boutiqueId })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r: any) => {
          const produits: any[] = r?.data ?? (Array.isArray(r) ? r : []);
          this.lignes = produits.map(p => ({
            produit: p,
            quantite_restante: p.stock_disponible ?? 0,
            prix_unitaire_vente: p.prix_vente ?? 0,
          }));
          this.applyFilter();
        },
      });
  }

  applyFilter(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filtered = this.lignes.filter(l =>
      !q || l.produit.nom?.toLowerCase().includes(q) || l.produit.code_barre?.toLowerCase().includes(q));
  }

  // ── Caisse ──────────────────────────────────────────────────────────────

  loadCaisse(): void {
    if (!this.boutiqueId) return;
    this.boutiqueSvc.findOne(this.boutiqueId).subscribe({
      next: (r: any) => {
        const b = r?.data ?? r;
        this.caisseActivee = !!b?.gestion_caisse_activee;
        this.modesPaiementActifs = Array.isArray(b?.modes_paiement) && b.modes_paiement.length > 0
          ? b.modes_paiement.filter((m: string) => m !== 'mixte' && m !== 'credit')
          : null;
        if (this.caisseActivee) {
          this.caisseSvc.getActiveSession(this.boutiqueId!, this.currentUser?.telephone).subscribe({
            next: (res: any) => { this.activeSessionId = res?.data?.id ?? null; },
            error: () => { this.activeSessionId = null; },
          });
        }
      },
    });
  }

  // ── Calculs ─────────────────────────────────────────────────────────────

  quantiteVendue(l: LigneComptage): number {
    const stock = l.produit.stock_disponible ?? 0;
    const restante = Number(l.quantite_restante);
    if (l.quantite_restante === null || isNaN(restante)) return 0;
    return Math.max(0, stock - restante);
  }

  montantLigne(l: LigneComptage): number {
    return this.quantiteVendue(l) * (Number(l.prix_unitaire_vente) || 0);
  }

  depasseStock(l: LigneComptage): boolean {
    const restante = Number(l.quantite_restante);
    return !isNaN(restante) && restante > (l.produit.stock_disponible ?? 0);
  }

  get lignesModifiees(): LigneComptage[] {
    return this.lignes.filter(l => this.quantiteVendue(l) > 0);
  }

  get montantTotal(): number {
    return this.lignesModifiees.reduce((s, l) => s + this.montantLigne(l), 0);
  }

  get hasErreurs(): boolean {
    return this.lignes.some(l => this.depasseStock(l));
  }

  get isValid(): boolean {
    return !!this.boutiqueId
      && this.lignesModifiees.length > 0
      && !this.hasErreurs
      && (!this.caisseActivee || !!this.activeSessionId);
  }

  onMontantRecuFocus(): void {
    if (this.montantRecu === null) this.montantRecu = this.montantTotal;
  }

  get monnaie(): number {
    return (Number(this.montantRecu) || 0) - this.montantTotal;
  }

  reinitialiserQuantites(): void {
    for (const l of this.lignes) l.quantite_restante = l.produit.stock_disponible ?? 0;
  }

  // ── Soumission ──────────────────────────────────────────────────────────

  submit(): void {
    if (!this.isValid) return;

    const body = {
      boutique: this.boutiqueId,
      user: this.currentUser?.telephone,
      mode_paiement: this.modePaiement,
      montant_recu: Number(this.montantRecu) || this.montantTotal,
      lignes: this.lignesModifiees.map(l => ({
        produit: l.produit.id,
        quantite_restante: Number(l.quantite_restante),
        prix_unitaire_vente: l.prix_unitaire_vente,
      })),
    };

    this.isSubmitting = true;
    this.ventesSvc.saveComptage(body)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (r: any) => {
          this.result = r?.data ?? r;
          this.toastr.success('Point de vente enregistré avec succès');
        },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de l\'enregistrement du point de vente'),
      });
  }

  get montantResultat(): number {
    return (this.result?.lignes ?? []).reduce((s: number, l: any) => s + (l.montant_ligne ?? 0), 0);
  }

  reset(): void {
    this.result = null;
    this.montantRecu = null;
    this.modePaiement = 'espece';
    this.loadProduits();
  }

  imprimerRecu(): void {
    const venteId = this.result?.idVente;
    if (!venteId) return;
    this.ventesSvc.imprimerRecu(venteId).subscribe({
      next: (r: any) => { if (r?.path) window.open(r.path, '_blank'); },
      error: () => this.toastr.error('Impossible de générer le reçu'),
    });
  }
}
