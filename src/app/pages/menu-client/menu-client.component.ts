import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { PublicMenuService } from '../../services/restaurant/public-menu.service';

type Etape = 'menu' | 'panier' | 'infos' | 'confirmation' | 'appel_ok';

@Component({
  selector: 'app-menu-client',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './menu-client.component.html',
})
export default class MenuClientComponent implements OnInit {
  boutiqueId: number | null = null;
  tableIdPreselect: number | null = null;

  boutique: any = null;
  tables: any[] = [];
  plats: any[] = [];
  boissons: any[] = [];
  menuDuJour = false;

  panier: { recette: any; quantite: number; note: string }[] = [];
  etape: Etape = 'menu';
  onglet: 'plats' | 'boissons' = 'plats';

  telephone = '';
  tableSelectionnee: number | null = null;

  isLoading = true;
  isSending = false;
  erreur: string | null = null;
  confirmation: any = null;

  readonly CATS_BOISSONS = ['Boissons', 'Alcools', 'Cocktails'];

  constructor(
    private route: ActivatedRoute,
    private publicMenuService: PublicMenuService,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.boutiqueId = params.has('boutique') ? +params.get('boutique')! : null;
      this.tableIdPreselect = params.has('table') ? +params.get('table')! : null;
      if (this.tableIdPreselect) this.tableSelectionnee = this.tableIdPreselect;
      if (this.boutiqueId) this.chargerMenu();
      else { this.isLoading = false; this.erreur = 'QR code invalide — aucune boutique spécifiée.'; }
    });
  }

  chargerMenu(): void {
    this.isLoading = true;
    this.publicMenuService.getMenu(this.boutiqueId!).subscribe({
      next: (r: any) => {
        this.boutique  = r.boutique;
        this.tables    = r.tables ?? [];
        this.plats     = r.plats ?? [];
        this.boissons  = r.boissons ?? [];
        this.menuDuJour = r.menuDuJour;
        this.isLoading  = false;
      },
      error: () => { this.erreur = 'Impossible de charger le menu. Réessayez.'; this.isLoading = false; }
    });
  }

  // ---- Groupement par catégorie ----

  groupes(liste: any[]): { cat: string; items: any[] }[] {
    const map = new Map<string, any[]>();
    for (const r of liste) {
      const cat = r.categorie || 'Menu';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }
    return Array.from(map.entries()).map(([cat, items]) => ({ cat, items }));
  }

  // ---- Panier ----

  ajouterAuPanier(r: any): void {
    const ex = this.panier.find(p => p.recette.id === r.id);
    if (ex) { ex.quantite++; }
    else { this.panier.push({ recette: r, quantite: 1, note: '' }); }
  }

  diminuer(i: number): void {
    if (this.panier[i].quantite <= 1) this.panier.splice(i, 1);
    else this.panier[i].quantite--;
  }

  augmenter(i: number): void { this.panier[i].quantite++; }

  supprimer(i: number): void { this.panier.splice(i, 1); }

  get total(): number {
    return this.panier.reduce((s, p) => s + p.quantite * p.recette.prix_vente, 0);
  }

  qteInPanier(r: any): number {
    return this.panier.find(p => p.recette.id === r.id)?.quantite ?? 0;
  }

  get panierVide(): boolean { return this.panier.length === 0; }
  get nbArticles(): number  { return this.panier.reduce((s, p) => s + p.quantite, 0); }

  // ---- Navigation ----

  allerPanier(): void  { this.etape = 'panier'; }
  allerMenu(): void    { this.etape = 'menu'; }
  allerInfos(): void   {
    if (this.panierVide) return;
    this.etape = 'infos';
  }

  // ---- Envoi commande ----

  envoyerCommande(): void {
    if (!this.telephone.trim()) { this.erreur = 'Votre numéro de téléphone est requis.'; return; }
    this.erreur = null;
    this.isSending = true;
    const dto = {
      boutique:  this.boutiqueId!,
      telephone: this.telephone.trim(),
      table:     this.tableSelectionnee ?? undefined,
      lignes: this.panier.map(p => ({
        recette:       p.recette.id,
        quantite:      p.quantite,
        prix_unitaire: p.recette.prix_vente,
        note:          p.note || undefined,
      })),
    };
    this.publicMenuService.passerCommande(dto).subscribe({
      next: (r: any) => {
        this.isSending = false;
        this.confirmation = r;
        this.etape = 'confirmation';
        this.panier = [];
      },
      error: (e: any) => {
        this.isSending = false;
        this.erreur = e?.error?.message || 'Une erreur est survenue. Réessayez.';
      }
    });
  }

  // ---- Appel serveur ----

  appelServeur(): void {
    this.isSending = true;
    this.publicMenuService.appelServeur(this.boutiqueId!, this.tableSelectionnee ?? undefined).subscribe({
      next: () => { this.isSending = false; this.etape = 'appel_ok'; },
      error: () => { this.isSending = false; this.etape = 'appel_ok'; } // succès côté UX même si erreur réseau
    });
  }

  recommencer(): void {
    this.etape = 'menu';
    this.confirmation = null;
    this.erreur = null;
    this.telephone = '';
    if (!this.tableIdPreselect) this.tableSelectionnee = null;
  }

  tableNom(id: number | null): string {
    if (!id) return '';
    const t = this.tables.find(t => t.id === id);
    return t ? `Table ${t.numero}${t.nom ? ' — ' + t.nom : ''}` : '';
  }
}
