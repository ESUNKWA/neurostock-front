import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NzSelectModule } from 'ng-zorro-antd/select';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { CommandeTableService } from '../../../services/restaurant/commande-table.service';
import { RecetteService } from '../../../services/restaurant/recette.service';
import { MenuJourService } from '../../../services/restaurant/menu-jour.service';
import { TableRestaurantService } from '../../../services/restaurant/table-restaurant.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-commande-table',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NzSelectModule],
  templateUrl: './commande.component.html',
  providers: [ToastrService],
})
export default class CommandeTableComponent implements OnInit {
  boutiques: any[] = [];
  tables: any[] = [];
  recettes: any[] = [];
  menuDuJour: any = null;        // null = pas de menu défini aujourd'hui
  menuDuJourIds: Set<number> = new Set();
  currentUser: any;
  selectedBoutiqueId: number | null = null;
  selectedTableId: number | null = null;

  panier: { recette: any; quantite: number; note: string }[] = [];

  commandeEnCours: any = null;
  isLoading = false;
  isSaving = false;
  isEncaissing = false;

  // Onglet actif du menu
  onglet: 'plats' | 'boissons' = 'plats';

  // Catégories considérées comme boissons
  readonly CATS_BOISSONS = ['Boissons', 'Alcools', 'Cocktails'];

  readonly STATUTS = [
    { value: 'en_cours', label: 'En cours',  css: 'warning' },
    { value: 'prete',    label: 'Prête',     css: 'info'    },
    { value: 'servie',   label: 'Servie',    css: 'primary' },
    { value: 'payee',    label: 'Payée',     css: 'success' },
    { value: 'annulee',  label: 'Annulée',   css: 'danger'  },
  ];

  constructor(
    private commandeService: CommandeTableService,
    private recetteService: RecetteService,
    private menuJourService: MenuJourService,
    private tableService: TableRestaurantService,
    private boutiqueService: BoutiqueService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: any,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      this.loadBoutiques();
      const code = user?.profil?.code?.toLowerCase();
      if (code !== 'admin' && code !== 'responsable_structure') {
        this.selectedBoutiqueId = user?.boutique?.id ?? null;
        if (this.selectedBoutiqueId) this.onBoutiqueReady();
      }
    });
  }

  loadBoutiques(): void {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    const autoSelect = (list: any[]) => {
      this.boutiques = list;
      if (!this.selectedBoutiqueId && list.length) {
        this.selectedBoutiqueId = list[0].id;
        this.onBoutiqueReady();
      }
    };
    if (code === 'admin') {
      this.boutiqueService.find().subscribe({ next: (r: any) => autoSelect(r?.data ?? []) });
    } else if (code === 'responsable_structure') {
      this.boutiqueService.findByStructure(this.currentUser.structure_id).subscribe({
        next: (r: any) => autoSelect(r?.data ?? [])
      });
    } else {
      this.boutiques = this.currentUser?.boutique ? [this.currentUser.boutique] : [];
    }
  }

  onBoutiqueChange(): void { this.onBoutiqueReady(); }

  onBoutiqueReady(): void {
    this.loadTables();
    this.loadRecettes();
    this.loadMenuDuJour();
    const tableId = this.route.snapshot.queryParamMap.get('table');
    if (tableId) this.selectedTableId = +tableId;
    const commandeId = this.route.snapshot.queryParamMap.get('commande');
    if (commandeId) this.chargerCommande(+commandeId);
  }

  loadMenuDuJour(): void {
    if (!this.selectedBoutiqueId) return;
    this.menuJourService.getToday(this.selectedBoutiqueId).subscribe({
      next: (r: any) => {
        this.menuDuJour = r?.data ?? null;
        this.menuDuJourIds = new Set((this.menuDuJour?.recettes ?? []).map((rc: any) => rc.id));
      },
      error: () => { this.menuDuJour = null; this.menuDuJourIds = new Set(); }
    });
  }

  loadTables(): void {
    if (!this.selectedBoutiqueId) return;
    this.tableService.getAll(this.selectedBoutiqueId).subscribe({
      next: (r: any) => { this.tables = r?.data ?? []; }
    });
  }

  loadRecettes(): void {
    if (!this.selectedBoutiqueId) return;
    this.recetteService.getAll(this.selectedBoutiqueId).subscribe({
      next: (r: any) => { this.recettes = (r?.data ?? []).filter((rec: any) => rec.actif); }
    });
  }

  chargerCommande(id: number): void {
    this.isLoading = true;
    this.commandeService.getById(id).subscribe({
      next: (r: any) => {
        this.commandeEnCours = r?.data ?? r;
        this.selectedTableId = this.commandeEnCours.table?.id ?? null;
        this.panier = (this.commandeEnCours.lignes ?? []).map((l: any) => ({
          recette: l.recette, quantite: l.quantite, note: l.note ?? '',
        }));
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  // ---- Séparation plats / boissons ----

  estBoisson(r: any): boolean {
    return this.CATS_BOISSONS.includes(r.categorie);
  }

  get recettesPlats(): any[] {
    const tous = this.recettes.filter(r => !this.estBoisson(r));
    // Si un menu du jour existe, filtrer uniquement les plats qu'il contient
    if (this.menuDuJour && this.menuDuJourIds.size > 0) {
      return tous.filter(r => this.menuDuJourIds.has(r.id));
    }
    return tous;
  }

  get recettesBoissons(): any[] {
    return this.recettes.filter(r => this.estBoisson(r));
  }

  get recettesOnglet(): any[] {
    return this.onglet === 'boissons' ? this.recettesBoissons : this.recettesPlats;
  }

  /** True si un menu du jour est défini (filtre actif) */
  get menuActif(): boolean { return !!this.menuDuJour; }

  get nbBoissons(): number  { return this.recettesBoissons.length; }
  get nbPlats(): number     { return this.recettesPlats.length; }

  // ---- Stock boissons ----

  /**
   * Nombre d'unités servables compte tenu du stock actuel de chaque ingrédient.
   * Retourne Infinity si la recette n'a pas de composition (stock non géré).
   */
  stockDispo(r: any): number {
    if (!r.compositions?.length) return Infinity;
    return Math.min(
      ...r.compositions.map((c: any) =>
        Math.floor((c.produit?.stock_disponible ?? 0) / (c.quantite || 1))
      )
    );
  }

  /** Stock restant après déduction de ce qui est déjà dans le panier. */
  stockDispoEffectif(r: any): number {
    const base = this.stockDispo(r);
    if (!isFinite(base)) return Infinity;
    const inPanier = this.panier.find(p => p.recette.id === r.id)?.quantite ?? 0;
    return base - inPanier;
  }

  enRupture(r: any): boolean {
    return isFinite(this.stockDispo(r)) && this.stockDispo(r) <= 0;
  }

  /** True si le stock de cette recette est géré (elle a des compositions liées au stock). */
  stockGere(r: any): boolean {
    return isFinite(this.stockDispo(r));
  }

  // ---- Panier ----

  ajouterAuPanier(r: any): void {
    if (this.estBoisson(r)) {
      if (this.stockDispoEffectif(r) <= 0) {
        this.toastr.warning(`"${r.nom}" est en rupture de stock`);
        return;
      }
    }
    const existing = this.panier.find(p => p.recette.id === r.id);
    if (existing) { existing.quantite++; }
    else { this.panier.push({ recette: r, quantite: 1, note: '' }); }
  }

  diminuerQuantite(index: number): void {
    if (this.panier[index].quantite <= 1) { this.panier.splice(index, 1); }
    else { this.panier[index].quantite--; }
  }

  augmenterQuantite(index: number): void {
    const ligne = this.panier[index];
    if (this.estBoisson(ligne.recette)) {
      // Vérifier le stock avant d'augmenter
      const dispo = this.stockDispo(ligne.recette);
      if (isFinite(dispo) && ligne.quantite >= dispo) {
        this.toastr.warning(`Stock max atteint pour "${ligne.recette.nom}" (${dispo} en stock)`);
        return;
      }
    }
    ligne.quantite++;
  }

  supprimerDuPanier(index: number): void { this.panier.splice(index, 1); }

  get totalPanier(): number {
    return this.panier.reduce((s, p) => s + p.quantite * p.recette.prix_vente, 0);
  }

  get panierVide(): boolean { return this.panier.length === 0; }

  get panierPlats(): typeof this.panier    { return this.panier.filter(p => !this.estBoisson(p.recette)); }
  get panierBoissons(): typeof this.panier { return this.panier.filter(p => this.estBoisson(p.recette)); }

  indexPanier(recette: any): number { return this.panier.findIndex(p => p.recette.id === recette.id); }

  // ---- Envoi commande ----

  validerCommande(): void {
    if (this.panierVide) { this.toastr.warning('Le panier est vide'); return; }
    if (!this.selectedBoutiqueId) { this.toastr.warning('Boutique requise'); return; }

    this.isSaving = true;
    const lignes = this.panier.map(p => ({
      recette:       p.recette.id,
      quantite:      p.quantite,
      prix_unitaire: p.recette.prix_vente,
      note:          p.note || null,
    }));

    if (this.commandeEnCours) {
      this.commandeService.ajouterLignes(this.commandeEnCours.id, lignes).subscribe({
        next: (r: any) => {
          this.isSaving = false;
          this.commandeEnCours = r?.data ?? r;
          this.panier = [];
          this.toastr.success('Lignes ajoutées à la commande');
        },
        error: (e: any) => { this.isSaving = false; this.toastr.error(e?.error?.message || 'Erreur'); }
      });
    } else {
      const dto = {
        boutique: this.selectedBoutiqueId,
        table:    this.selectedTableId,
        user:     this.currentUser?.telephone ?? null,
        lignes,
      };
      this.commandeService.create(dto).subscribe({
        next: (r: any) => {
          this.isSaving = false;
          this.commandeEnCours = r?.data ?? r;
          this.panier = [];
          this.toastr.success('Commande créée !');
          // Recharger les recettes pour avoir le stock à jour
          this.loadRecettes();
        },
        error: (e: any) => { this.isSaving = false; this.toastr.error(e?.error?.message || 'Erreur'); }
      });
    }
  }

  // ---- Encaissement ----

  async encaisser(): Promise<void> {
    if (!this.commandeEnCours) return;
    const aUneTable = !!this.commandeEnCours.table;
    const tableNum  = this.commandeEnCours.table?.numero;

    const { value: swalResult, isConfirmed } = await Swal.fire({
      title: 'Encaisser la commande',
      html: `
        <div class="fs-3 fw-bold text-success mb-3">${Number(this.commandeEnCours.montant_total ?? 0).toLocaleString('fr-FR')} FCFA</div>
        <p class="text-muted small mb-3">Le stock sera mis à jour automatiquement.</p>
        ${aUneTable ? `
        <div class="form-check text-start d-inline-block">
          <input class="form-check-input" type="checkbox" id="swal-liberer" checked>
          <label class="form-check-label" for="swal-liberer">
            Libérer la <strong>Table ${tableNum}</strong> après encaissement
          </label>
        </div>` : ''}
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-cash-coin me-1"></i> Encaisser',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#198754',
      preConfirm: () => {
        const cb = document.getElementById('swal-liberer') as HTMLInputElement | null;
        return { liberer: cb ? cb.checked : false };
      },
    });
    if (!isConfirmed) return;

    const libererTable = swalResult?.liberer ?? false;
    this.isEncaissing = true;
    this.commandeService.encaisser(this.commandeEnCours.id, libererTable).subscribe({
      next: () => {
        this.isEncaissing = false;
        const msg = libererTable && aUneTable
          ? `Encaissé et table ${tableNum} libérée.`
          : 'Commande encaissée — la table reste occupée.';
        Swal.fire({ icon: 'success', title: 'Encaissé !', text: msg, timer: 2000, showConfirmButton: false });
        this.router.navigate(['/restaurant/tables']);
      },
      error: (e: any) => { this.isEncaissing = false; this.toastr.error(e?.error?.message || 'Erreur'); }
    });
  }

  statutInfo(v: string) { return this.STATUTS.find(s => s.value === v) ?? { label: v, css: 'secondary' }; }

  get isAdmin(): boolean {
    const c = this.currentUser?.profil?.code?.toLowerCase();
    return c === 'admin' || c === 'responsable_structure';
  }

  tableNom(id: number | null): string {
    if (!id) return '—';
    const t = this.tables.find(t => t.id === id);
    return t ? `Table ${t.numero}${t.nom ? ' — ' + t.nom : ''}` : `Table #${id}`;
  }
}
