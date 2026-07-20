import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { first } from 'rxjs';
import { PrevisionService } from '../../../services/analyse-ia/prevision.service';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { ProduitService } from '../../../services/gestion-des-produits/produit.service';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-prix-suggere',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ToastrModule, NzSelectModule],
  templateUrl: './prix-suggere.component.html',
  styleUrl: './prix-suggere.component.scss',
})
export default class PrixSuggereComponent implements OnInit {
  private previsionService = inject(PrevisionService);
  private authService = inject(AuthService);
  private boutiqueService = inject(BoutiqueService);
  private produitService = inject(ProduitService);
  private toastr = inject(ToastrService);

  currentUser: any;
  boutiques: any[] = [];
  idBoutique = 0;
  produits: any[] = [];
  isLoadingProduits = false;
  filtreMargeOnly = false;

  selectedProduit: any = null;
  prixSuggereData: any = null;
  prixSuggereError: string | null = null;
  isLoadingPrix = false;
  isAppliquerPrix = false;

  get isAdmin(): boolean {
    const code = this.currentUser?.profil?.code;
    return code === 'admin' || code === 'responsable_structure';
  }

  get boutiqueId(): number {
    return this.isAdmin ? this.idBoutique : (this.currentUser?.boutique_id ?? 0);
  }

  margePercent(p: any): number {
    if (!p.prix_achat || p.prix_achat === 0) return 0;
    return Math.round(((p.prix_vente - p.prix_achat) / p.prix_achat) * 1000) / 10;
  }

  margeClass(p: any): string {
    const m = this.margePercent(p);
    if (m < 10) return 'text-danger fw-bold';
    if (m < 20) return 'text-warning fw-semibold';
    return 'text-success';
  }

  margeBadge(p: any): { label: string; cls: string } {
    const m = this.margePercent(p);
    if (m < 10)  return { label: 'Faible',  cls: 'bg-danger' };
    if (m < 20)  return { label: 'Moyenne', cls: 'bg-warning text-dark' };
    return       { label: 'Bonne',  cls: 'bg-success' };
  }

  get produitsFiltres(): any[] {
    if (!this.filtreMargeOnly) return this.produits;
    return this.produits.filter(p => this.margePercent(p) < 20);
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      this.loadBoutiques();
      if (!this.isAdmin) this.loadProduits();
    });
  }

  loadBoutiques(): void {
    if (!this.isAdmin) return;
    if (this.currentUser?.profil?.code === 'admin') {
      this.boutiqueService.find().subscribe({
        next: (r: any) => { if (r.status === 'success') this.boutiques = r.data; }
      });
    } else {
      this.boutiques = this.currentUser.boutiques ?? [];
    }
  }

  onBoutiqueChange(): void {
    this.selectedProduit = null;
    this.prixSuggereData = null;
    this.loadProduits();
  }

  loadProduits(): void {
    if (!this.boutiqueId) return;
    this.isLoadingProduits = true;
    this.produits = [];
    this.produitService.getProduits({ boutique: this.boutiqueId }).subscribe({
      next: (r: any) => {
        this.produits = r?.data ?? r ?? [];
        this.isLoadingProduits = false;
      },
      error: () => { this.isLoadingProduits = false; }
    });
  }

  voirSuggestion(produit: any): void {
    if (this.selectedProduit?.id === produit.id && this.prixSuggereData) {
      // Fermer si déjà ouvert
      this.selectedProduit = null;
      this.prixSuggereData = null;
      return;
    }
    this.selectedProduit = produit;
    this.prixSuggereData = null;
    this.prixSuggereError = null;
    this.isLoadingPrix = true;

    const boutiqueId = produit.boutique?.id ?? this.boutiqueId;
    this.previsionService.getPrixSuggere(produit.id, boutiqueId).subscribe({
      next: (res: any) => {
        this.prixSuggereData = res?.data ?? res;
        this.isLoadingPrix = false;
      },
      error: (err: any) => {
        this.isLoadingPrix = false;
        this.prixSuggereError = err?.error?.message ?? 'Suggestion IA temporairement indisponible.';
      }
    });
  }

  appliquerPrix(): void {
    if (!this.selectedProduit || !this.prixSuggereData) return;
    this.isAppliquerPrix = true;

    this.produitService.updateProduit(this.selectedProduit.id, { prix_vente: this.prixSuggereData.prix_suggere })
      .pipe(first())
      .subscribe({
        next: () => {
          this.isAppliquerPrix = false;
          this.toastr.success(`Prix mis à jour : ${this.prixSuggereData.prix_suggere.toLocaleString('fr-FR')} FCFA`);
          // Mettre à jour localement
          const idx = this.produits.findIndex(p => p.id === this.selectedProduit.id);
          if (idx !== -1) this.produits[idx].prix_vente = this.prixSuggereData.prix_suggere;
          this.selectedProduit = null;
          this.prixSuggereData = null;
        },
        error: () => {
          this.isAppliquerPrix = false;
          this.toastr.error('Erreur lors de l\'application du prix.');
        }
      });
  }

  ignorer(): void {
    this.selectedProduit = null;
    this.prixSuggereData = null;
    this.prixSuggereError = null;
  }
}
