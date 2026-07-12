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
  styles: [`
    .mob-cmd { position:fixed; inset:0; background:#f3f4f6; display:flex; flex-direction:column; z-index:1200; }
    .mob-cmd-header { background:#fff; border-bottom:1px solid #dee2e6; padding:0 .875rem; height:56px; display:flex; align-items:center; gap:.5rem; flex-shrink:0; }
    .mob-cmd-new-btn { background:#e85d04; color:#fff; border:none; border-radius:8px; padding:.35rem .55rem; font-size:.9rem; display:flex; align-items:center; gap:.25rem; flex-shrink:0; cursor:pointer; font-weight:700; white-space:nowrap; }
    .mob-tabs { display:flex; background:#fff; border-bottom:1px solid #dee2e6; flex-shrink:0; }
    .mob-tab { flex:1; padding:.7rem .5rem; border:none; background:none; font-weight:600; font-size:.9rem; color:#6c757d; border-bottom:3px solid transparent; }
    .mob-tab.active { color:#e85d04; border-bottom-color:#e85d04; }
    .mob-menu-scroll { flex:1; overflow-y:auto; padding:.75rem; -webkit-overflow-scrolling:touch; }
    .mob-menu-grid { display:grid; grid-template-columns:1fr 1fr; gap:.6rem; }
    .mob-item { background:#fff; border:2px solid #e9ecef; border-radius:12px; padding:.75rem .65rem; position:relative; display:flex; flex-direction:column; gap:.25rem; min-height:80px; cursor:pointer; -webkit-tap-highlight-color:transparent; transition:border-color .1s,background .1s; }
    .mob-item:active { opacity:.8; }
    .mob-item.in-cart { border-color:#e85d04; background:#fff4ed; }
    .mob-item.rupture { opacity:.45; pointer-events:none; }
    .mob-qty-badge { position:absolute; top:-9px; right:-9px; background:#e85d04; color:#fff; border-radius:99px; min-width:22px; height:22px; padding:0 4px; display:flex; align-items:center; justify-content:center; font-size:.7rem; font-weight:700; box-shadow:0 1px 4px rgba(232,93,4,.4); }
    .mob-item-name { font-weight:600; font-size:.82rem; line-height:1.35; color:#212529; }
    .mob-item-price { font-weight:700; font-size:.85rem; color:#e85d04; }
    .mob-cart-bar { background:#fff; border-top:1px solid #dee2e6; padding:.6rem .875rem; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; box-shadow:0 -2px 8px rgba(0,0,0,.06); cursor:pointer; }
    .mob-cart-cta { background:#e85d04; color:#fff; border:none; border-radius:10px; padding:.5rem 1.1rem; font-weight:600; font-size:.875rem; display:flex; align-items:center; gap:.4rem; flex-shrink:0; }
    .mob-cart-cta:disabled { background:#adb5bd; }
    .mob-overlay { position:fixed; inset:0; z-index:1300; display:flex; flex-direction:column; justify-content:flex-end; }
    .mob-overlay-bg { position:absolute; inset:0; background:rgba(0,0,0,.5); }
    .mob-sheet { position:relative; background:#fff; border-radius:20px 20px 0 0; max-height:88vh; display:flex; flex-direction:column; }
    .mob-sheet-handle { width:36px; height:4px; background:#e85d04; border-radius:2px; margin:10px auto 0; flex-shrink:0; }
    .mob-sheet-head { padding:.875rem 1rem; border-bottom:1px solid #dee2e6; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
    .mob-sheet-body { overflow-y:auto; flex:1; }
    .mob-cart-row { display:flex; align-items:flex-start; padding:.65rem 1rem; border-bottom:1px solid #f0f0f0; }
    .mob-cart-info { flex:1; min-width:0; }
    .mob-qty-ctrl { display:flex; align-items:center; gap:.375rem; margin-top:.375rem; }
    .mob-qty-btn { width:30px; height:30px; border-radius:8px; border:1.5px solid #e85d04; background:#fff; display:flex; align-items:center; justify-content:center; font-size:1rem; line-height:1; color:#e85d04; font-weight:700; }
    .mob-sheet-foot { padding:.875rem 1rem; border-top:1px solid #dee2e6; flex-shrink:0; }
    .mob-send-btn { width:100%; padding:.75rem; background:#e85d04; border:none; border-radius:12px; color:#fff; font-weight:700; font-size:1rem; display:flex; align-items:center; justify-content:center; gap:.5rem; box-shadow:0 4px 14px rgba(232,93,4,.35); }
    .mob-send-btn:disabled { background:#adb5bd; box-shadow:none; }
    .mob-encaisser-btn { width:100%; padding:.7rem; background:#198754; border:none; border-radius:12px; color:#fff; font-weight:700; font-size:.9rem; display:flex; align-items:center; justify-content:center; gap:.5rem; margin-top:.5rem; }
    .mob-encaisser-btn:disabled { background:#adb5bd; }
  `],
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
  commandeBoissonsEnCours: any = null;
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
  get toutBoissons(): boolean { return this.panier.length > 0 && this.panier.every(p => this.estBoisson(p.recette)); }

  indexPanier(recette: any): number { return this.panier.findIndex(p => p.recette.id === recette.id); }

  get commandesCourantes(): any[] {
    return [this.commandeEnCours, this.commandeBoissonsEnCours].filter(Boolean);
  }

  get totalCommandesCourantes(): number {
    return this.commandesCourantes.reduce((s, c) => s + (c.montant_total ?? 0), 0);
  }

  get totalLignesCommandesCourantes(): number {
    return this.commandesCourantes.reduce((s, c) => s + (c.lignes?.length ?? 0), 0);
  }

  get tousPayes(): boolean {
    return this.commandesCourantes.length > 0 && this.commandesCourantes.every(c => c.statut === 'payee');
  }

  get labelBoutonEnvoyer(): string {
    const hasFood   = this.panierPlats.length > 0;
    const hasDrinks = this.panierBoissons.length > 0;
    const hasExisting = this.commandesCourantes.length > 0;
    if (hasFood && hasDrinks) return hasExisting ? 'Ajouter (plats + boissons)' : 'Cuisine + Bar';
    if (hasDrinks)            return hasExisting ? 'Ajouter boissons' : 'Servir les boissons';
    return hasExisting ? 'Ajouter au ticket' : 'Envoyer en cuisine';
  }

  // ---- Envoi commande ----

  private creerCommandeAsync(dto: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.commandeService.create(dto).subscribe({
        next: (r: any) => resolve(r?.data ?? r),
        error: (e: any) => reject(e),
      });
    });
  }

  private ajouterLignesAsync(id: number, lignes: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.commandeService.ajouterLignes(id, lignes).subscribe({
        next: (r: any) => resolve(r?.data ?? r),
        error: (e: any) => reject(e),
      });
    });
  }

  async validerCommande(): Promise<void> {
    if (this.panierVide) { this.toastr.warning('Le panier est vide'); return; }
    if (!this.selectedBoutiqueId) { this.toastr.warning('Boutique requise'); return; }
    if (!this.selectedTableId) { this.toastr.warning('Veuillez sélectionner une table'); return; }

    this.isSaving = true;
    const baseDto = {
      boutique: this.selectedBoutiqueId,
      table:    this.selectedTableId,
      user:     this.currentUser?.telephone ?? null,
    };
    const toLigne = (p: any) => ({
      recette:       p.recette.id,
      quantite:      p.quantite,
      prix_unitaire: p.recette.prix_vente,
      note:          p.note || null,
    });
    const lignesPlats    = this.panierPlats.map(toLigne);
    const lignesBoissons = this.panierBoissons.map(toLigne);
    const hasExisting    = this.commandesCourantes.length > 0;

    try {
      // --- Plats → cuisine ---
      if (lignesPlats.length > 0) {
        if (this.commandeEnCours) {
          this.commandeEnCours = await this.ajouterLignesAsync(this.commandeEnCours.id, lignesPlats);
        } else {
          this.commandeEnCours = await this.creerCommandeAsync({ ...baseDto, lignes: lignesPlats });
        }
      }

      // --- Boissons → bar (commande séparée si des plats existent aussi) ---
      if (lignesBoissons.length > 0) {
        if (this.commandeBoissonsEnCours) {
          this.commandeBoissonsEnCours = await this.ajouterLignesAsync(this.commandeBoissonsEnCours.id, lignesBoissons);
        } else if (lignesPlats.length === 0 && !this.commandeEnCours) {
          // Boissons seules sans commande nourriture → commande unique
          this.commandeEnCours = await this.creerCommandeAsync({ ...baseDto, lignes: lignesBoissons });
        } else {
          // Commande boissons séparée, liée à la même table
          this.commandeBoissonsEnCours = await this.creerCommandeAsync({ ...baseDto, lignes: lignesBoissons });
        }
      }

      // Toast adapté
      const hasBoth = lignesPlats.length > 0 && lignesBoissons.length > 0;
      if (!hasExisting) {
        this.toastr.success(
          hasBoth ? 'Plats en cuisine · Boissons prêtes !'
          : lignesBoissons.length > 0 ? 'Boissons prêtes à servir !'
          : 'Commande envoyée en cuisine !'
        );
      } else {
        this.toastr.success(
          hasBoth ? 'Plats et boissons ajoutés'
          : lignesBoissons.length > 0 ? 'Boissons ajoutées'
          : 'Lignes ajoutées au ticket'
        );
      }

      this.panier = [];
      this.showCart = false;
      this.loadRecettes();
    } catch (e: any) {
      this.toastr.error(e?.error?.message || 'Erreur');
    } finally {
      this.isSaving = false;
    }
  }

  // ---- Encaissement ----

  async encaisser(): Promise<void> {
    if (!this.commandeEnCours) return;
    const aUneTable = !!this.commandeEnCours.table;
    const tableNum  = this.commandeEnCours.table?.numero;
    const ids = this.commandesCourantes.filter(c => c.statut !== 'payee').map(c => c.id);
    const total = this.totalCommandesCourantes;

    const { value: swalResult, isConfirmed } = await Swal.fire({
      title: 'Encaisser la commande',
      html: `
        <div class="fs-3 fw-bold text-success mb-3">${Number(total).toLocaleString('fr-FR')} FCFA</div>
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
    this.commandeService.encaisserBatch(ids, libererTable).subscribe({
      next: () => {
        this.isEncaissing = false;
        const msg = libererTable && aUneTable
          ? `Encaissé et table ${tableNum} libérée.`
          : 'Commande(s) encaissée(s) — la table reste occupée.';
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

  get isMobileView(): boolean {
    const c = this.currentUser?.profil?.code?.toLowerCase();
    return c === 'serveur' || c === 'cuisiner';
  }

  showCart = false;

  nouvelleCommande(): void {
    this.commandeEnCours = null;
    this.commandeBoissonsEnCours = null;
    this.panier = [];
    this.selectedTableId = null;
    this.showCart = false;
  }

  get panierCount(): number {
    return this.panier.reduce((s, p) => s + p.quantite, 0);
  }

  quantiteInPanier(recetteId: number): number {
    return this.panier.find(p => p.recette.id === recetteId)?.quantite ?? 0;
  }

  tableNom(id: number | null): string {
    if (!id) return '—';
    const t = this.tables.find(t => t.id === id);
    return t ? `Table ${t.numero}${t.nom ? ' — ' + t.nom : ''}` : `Table #${id}`;
  }
}
