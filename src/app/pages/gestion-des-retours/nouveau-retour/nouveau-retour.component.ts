import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { RetourVenteService } from '../../../services/gestion-des-retours/retour-vente.service';
import { VentesService } from '../../../services/gestion-des-ventes/ventes.service';
import { AuthService } from '../../../services/auth/auth.service';
import { NzSelectModule } from 'ng-zorro-antd/select';

interface LigneRetour {
  produit_id: number;
  nom: string;
  quantite_vendue: number;
  prix_unitaire: number;
  quantite_retournee: number;
}

@Component({
  selector: 'app-nouveau-retour',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, NzSelectModule],
  templateUrl: './nouveau-retour.component.html',
  providers: [ToastrService],
})
export default class NouveauRetourComponent implements OnInit {
  currentUser: any;
  boutiques: any[] = [];
  idBoutique = 0;

  // Recherche de vente
  searchReference = '';
  searchMontant: number | null = null;
  searchDateDebut = '';
  searchDateFin = '';
  searchLoading = false;
  ventesResultats: any[] = [];
  searchDone = false;

  // Vente sélectionnée
  vente: any = null;
  lignes: LigneRetour[] = [];
  motif = '';
  isSubmitting = false;

  result: any = null;

  constructor(
    private retourSvc: RetourVenteService,
    private ventesSvc: VentesService,
    private authService: AuthService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((u: any) => {
      this.currentUser = u;
      this.loadBoutiques();
    });
  }

  // ── Permissions ────────────────────────────────────────────────────────────
  get peutFaireRetour(): boolean {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    if (code === 'admin' || code === 'responsable_structure') return true;
    return !!this.currentUser?.peut_faire_retour;
  }

  get isAdminOrGerant(): boolean {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    return code === 'admin' || code === 'gerant';
  }

  loadBoutiques(): void {
    // Les boutiques sont déjà dans currentUser — aucun appel API nécessaire
    const embedded: any[] = this.currentUser?.boutiques ?? [];
    if (embedded.length > 0) {
      this.boutiques = embedded;
      this.idBoutique = this.currentUser?.boutique_id ?? embedded[0].id;
      return;
    }
    // Fallback : boutique unique sur l'objet user
    if (this.currentUser?.boutique) {
      this.boutiques = [this.currentUser.boutique];
      this.idBoutique = this.currentUser.boutique_id ?? this.currentUser.boutique.id;
    }
  }

  onBoutiqueChange(): void {
    this.ventesResultats = [];
    this.searchDone = false;
    this.vente = null;
    this.lignes = [];
  }

  // ── Recherche de ventes ────────────────────────────────────────────────────
  rechercherVentes(): void {
    if (!this.idBoutique) { this.toastr.warning('Sélectionnez une boutique'); return; }
    const params: any = { boutique: this.idBoutique, page: 1, limit: 10 };
    if (this.searchReference?.trim()) params['reference'] = this.searchReference.trim();
    if (this.searchMontant != null && !isNaN(Number(this.searchMontant))) params['montant'] = this.searchMontant;
    if (this.searchDateDebut) params['date_debut'] = this.searchDateDebut;
    if (this.searchDateFin) params['date_fin'] = this.searchDateFin;

    this.searchLoading = true;
    this.searchDone = false;
    this.vente = null;
    this.lignes = [];

    this.ventesSvc.getAllVentes(params).subscribe({
      next: (r: any) => {
        this.ventesResultats = r?.data?.items ?? r?.data ?? (Array.isArray(r) ? r : []);
        this.searchLoading = false;
        this.searchDone = true;
      },
      error: () => {
        this.searchLoading = false;
        this.searchDone = true;
        this.toastr.error('Erreur lors de la recherche');
      },
    });
  }

  resetRecherche(): void {
    this.searchReference = '';
    this.searchMontant = null;
    this.searchDateDebut = '';
    this.searchDateFin = '';
    this.ventesResultats = [];
    this.searchDone = false;
    this.vente = null;
    this.lignes = [];
  }

  // ── Sélection d'une vente ──────────────────────────────────────────────────
  selectionnerVente(v: any): void {
    this.vente = null;
    this.lignes = [];

    this.ventesSvc.getDetailVente(v.id).subscribe({
      next: (r: any) => {
        const data = r?.data ?? r;
        this.vente = data;
        const details: any[] = data.detail_vente ?? data.details ?? [];
        this.lignes = details.map((d: any) => ({
          produit_id: d.produit?.id ?? d.produit_id,
          nom: d.produit?.nom ?? `Produit #${d.produit_id}`,
          quantite_vendue: d.quantite,
          prix_unitaire: d.prix_unitaire_vente ?? d.prix_unitaire,
          quantite_retournee: 0,
        }));
        // Scroll to form
        setTimeout(() => {
          document.getElementById('retour-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Impossible de charger la vente'),
    });
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  get lignesSelectionnees(): LigneRetour[] {
    return this.lignes.filter(l => l.quantite_retournee > 0);
  }

  get totalRembourse(): number {
    return this.lignesSelectionnees.reduce((s, l) => s + l.quantite_retournee * l.prix_unitaire, 0);
  }

  get isValid(): boolean {
    return !!this.vente && !!this.idBoutique && this.lignesSelectionnees.length > 0;
  }

  // ── Soumission ─────────────────────────────────────────────────────────────
  submit(): void {
    if (!this.isValid) return;
    this.isSubmitting = true;
    this.retourSvc.create({
      vente_id: this.vente.id,
      boutique: this.idBoutique,
      motif: this.motif.trim() || undefined,
      user: this.currentUser?.telephone ?? undefined,
      details: this.lignesSelectionnees.map(l => ({
        produit_id: l.produit_id,
        quantite_retournee: l.quantite_retournee,
      })),
    }).pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: (r: any) => {
        this.result = r?.data ?? r;
        this.toastr.success('Retour enregistré avec succès');
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors du retour'),
    });
  }

  reset(): void {
    this.vente = null;
    this.lignes = [];
    this.motif = '';
    this.result = null;
    this.ventesResultats = [];
    this.searchDone = false;
    this.searchReference = '';
    this.searchMontant = null;
    this.searchDateDebut = '';
    this.searchDateFin = '';
  }
}
