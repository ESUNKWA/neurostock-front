import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { RecetteService } from '../../../services/restaurant/recette.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { AuthService } from '../../../services/auth/auth.service';
import { ProduitService } from '../../../services/gestion-des-produits/produit.service';

declare var bootstrap: any;

@Component({
  selector: 'app-recettes',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NzSelectModule],
  templateUrl: './recettes.component.html',
  providers: [ToastrService],
})
export default class RecettesComponent implements OnInit {
  recettes: any[] = [];
  produits: any[] = [];
  boutiques: any[] = [];
  currentUser: any;

  // Filtres & pagination
  onglet: 'plats' | 'boissons' = 'plats';
  recherche: string = '';
  afficherInactifs: boolean = false;
  readonly parPage = 12;
  pagePlats    = 1;
  pageBoissons = 1;

  // Import depuis stock
  produitsImport: { produit: any; selectionne: boolean; prix_vente: number; categorie: string }[] = [];
  categorieImportGlobale: string = 'Boissons';
  rechercheImport: string = '';
  isImporting = false;

  selectedBoutiqueId: number | null = null;
  isLoading = false;
  isSaving = false;
  editingId: number | null = null;

  form!: FormGroup;

  readonly CATEGORIES    = ['Entrées', 'Plats', 'Boissons', 'Desserts', 'Alcools', 'Cocktails', 'Autres'];
  readonly CATS_BOISSONS = ['Boissons', 'Alcools', 'Cocktails'];

  constructor(
    private fb: FormBuilder,
    private recetteService: RecetteService,
    private boutiqueService: BoutiqueService,
    private authService: AuthService,
    private produitService: ProduitService,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: any,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      this.loadBoutiques();
      const code = user?.profil?.code?.toLowerCase();
      if (code !== 'admin' && code !== 'responsable_structure') {
        this.selectedBoutiqueId = user?.boutique?.id ?? null;
        if (this.selectedBoutiqueId) { this.loadRecettes(); this.loadProduits(); }
      }
    });
  }

  initForm(): void {
    this.form = this.fb.group({
      nom:          ['', Validators.required],
      categorie:    [null],
      prix_vente:   [0, [Validators.required, Validators.min(0)]],
      description:  [''],
      actif:        [true],
      compositions: this.fb.array([]),
    });
  }

  get compositions(): FormArray { return this.form.get('compositions') as FormArray; }

  ajouterComposition(): void {
    this.compositions.push(this.fb.group({
      produit:  [null],
      quantite: [1, [Validators.min(0.01)]],
    }));
  }

  supprimerComposition(i: number): void { this.compositions.removeAt(i); }

  // ---- Boutiques ----

  loadBoutiques(): void {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    const autoSelect = (list: any[]) => {
      this.boutiques = list;
      if (!this.selectedBoutiqueId && list.length) {
        this.selectedBoutiqueId = list[0].id;
        this.loadRecettes();
        this.loadProduits();
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

  onBoutiqueChange(): void { this.loadRecettes(); this.loadProduits(); }

  loadRecettes(): void {
    if (!this.selectedBoutiqueId) { this.recettes = []; return; }
    this.isLoading = true;
    this.recetteService.getAll(this.selectedBoutiqueId).subscribe({
      next: (r: any) => { this.recettes = r?.data ?? []; this.isLoading = false; },
      error: () => { this.recettes = []; this.isLoading = false; }
    });
  }

  loadProduits(): void {
    if (!this.selectedBoutiqueId) return;
    this.produitService.getProduits({ boutique: this.selectedBoutiqueId }).subscribe({
      next: (r: any) => { this.produits = r?.data ?? []; }
    });
  }

  // ---- Séparation plats / boissons ----

  estBoisson(r: any): boolean {
    return this.CATS_BOISSONS.includes(r.categorie);
  }

  private filtrer(liste: any[]): any[] {
    let res = this.afficherInactifs ? liste : liste.filter(r => r.actif);
    if (this.recherche.trim()) {
      const q = this.recherche.toLowerCase();
      res = res.filter(r => r.nom.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q));
    }
    return res;
  }

  // Listes filtrées complètes (pour les compteurs et la pagination)
  get recettesPlats(): any[]    { return this.filtrer(this.recettes.filter(r => !this.estBoisson(r))); }
  get recettesBoissons(): any[] { return this.filtrer(this.recettes.filter(r => this.estBoisson(r))); }

  // Pagination
  get totalPagesPlats(): number    { return Math.max(1, Math.ceil(this.recettesPlats.length / this.parPage)); }
  get totalPagesBoissons(): number { return Math.max(1, Math.ceil(this.recettesBoissons.length / this.parPage)); }

  get recettesPlatsPaginees(): any[] {
    const s = (this.pagePlats - 1) * this.parPage;
    return this.recettesPlats.slice(s, s + this.parPage);
  }

  get recettesBoissonsPagees(): any[] {
    const s = (this.pageBoissons - 1) * this.parPage;
    return this.recettesBoissons.slice(s, s + this.parPage);
  }

  pagesArray(total: number): number[] { return Array.from({ length: total }, (_, i) => i + 1); }

  onRechercheChange(): void { this.pagePlats = 1; this.pageBoissons = 1; }
  onOngletChange(o: 'plats' | 'boissons'): void { this.onglet = o; }

  // ---- Stats ----

  get nbPlatsActifs(): number     { return this.recettes.filter(r => !this.estBoisson(r) && r.actif).length; }
  get nbBoissonsActives(): number { return this.recettes.filter(r =>  this.estBoisson(r) && r.actif).length; }
  get nbInactifs(): number        { return this.recettes.filter(r => !r.actif).length; }

  // ---- Groupement par catégorie ----

  groupesParCategorie(liste: any[]): { cat: string; items: any[] }[] {
    const map = new Map<string, any[]>();
    for (const r of liste) {
      const cat = r.categorie || 'Autres';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }
    return Array.from(map.entries()).map(([cat, items]) => ({ cat, items }));
  }

  // ---- Stock boissons ----

  stockDispo(r: any): number {
    if (!r.compositions?.length) return Infinity;
    return Math.min(...r.compositions.map((c: any) =>
      Math.floor((c.produit?.stock_disponible ?? 0) / (c.quantite || 1))
    ));
  }

  stockGere(r: any): boolean { return isFinite(this.stockDispo(r)); }
  enRupture(r: any): boolean { return this.stockGere(r) && this.stockDispo(r) <= 0; }

  // ---- Modals ----

  ouvrirModalCreation(categorieDefaut?: string): void {
    this.editingId = null;
    this.initForm();
    if (categorieDefaut) this.form.patchValue({ categorie: categorieDefaut });
    // Pré-sélectionner la bonne catégorie selon l'onglet courant
    else if (this.onglet === 'boissons') this.form.patchValue({ categorie: 'Boissons' });
    this.ajouterComposition();
    if (isPlatformBrowser(this.platformId)) {
      const m = document.getElementById('modal-recette');
      if (m) new bootstrap.Modal(m).show();
    }
  }

  ouvrirModalEdit(recette: any): void {
    this.editingId = recette.id;
    this.initForm();
    this.form.patchValue({
      nom: recette.nom, categorie: recette.categorie,
      prix_vente: recette.prix_vente, description: recette.description, actif: recette.actif,
    });
    (recette.compositions ?? []).forEach((c: any) => {
      this.compositions.push(this.fb.group({
        produit:  [c.produit?.id],
        quantite: [c.quantite, [Validators.min(0.01)]],
      }));
    });
    if (isPlatformBrowser(this.platformId)) {
      const m = document.getElementById('modal-recette');
      if (m) new bootstrap.Modal(m).show();
    }
  }

  sauvegarder(): void {
    if (this.form.invalid) { this.toastr.warning('Veuillez remplir tous les champs requis'); return; }
    this.isSaving = true;
    const v = this.form.value;
    const payload = {
      ...v,
      boutique: this.selectedBoutiqueId,
      compositions: (v.compositions ?? []).filter((c: any) => c.produit && +c.quantite > 0),
    };
    const obs = this.editingId
      ? this.recetteService.update(this.editingId, payload)
      : this.recetteService.create(payload);

    obs.subscribe({
      next: () => {
        this.isSaving = false;
        const m = document.getElementById('modal-recette');
        if (m) bootstrap.Modal.getInstance(m)?.hide();
        this.toastr.success(this.editingId ? 'Recette modifiée' : 'Recette créée');
        this.loadRecettes();
      },
      error: (e: any) => { this.isSaving = false; this.toastr.error(e?.error?.message || 'Erreur'); }
    });
  }

  async supprimer(recette: any): Promise<void> {
    const r = await Swal.fire({
      title: `Supprimer "${recette.nom}" ?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
    });
    if (!r.isConfirmed) return;
    this.recetteService.remove(recette.id).subscribe({
      next: () => { this.toastr.success('Recette supprimée'); this.loadRecettes(); },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur')
    });
  }

  // ---- Import depuis stock ----

  ouvrirModalImport(): void {
    this.rechercheImport = '';
    this.categorieImportGlobale = 'Boissons';
    this.produitsImport = this.produits.map(p => ({
      produit:     p,
      selectionne: false,
      prix_vente:  p.prix_vente ?? 0,
      categorie:   'Boissons',
    }));
    if (isPlatformBrowser(this.platformId)) {
      const m = document.getElementById('modal-import-stock');
      if (m) new bootstrap.Modal(m).show();
    }
  }

  get produitsImportFiltres() {
    const q = this.rechercheImport.toLowerCase();
    return q
      ? this.produitsImport.filter(p => p.produit.nom.toLowerCase().includes(q))
      : this.produitsImport;
  }

  get nbSelectionnes(): number { return this.produitsImport.filter(p => p.selectionne).length; }

  toutSelectionner(val: boolean): void { this.produitsImportFiltres.forEach(p => { p.selectionne = val; }); }

  appliquerCategorieGlobale(): void {
    this.produitsImport.filter(p => p.selectionne).forEach(p => { p.categorie = this.categorieImportGlobale; });
  }

  confirmerImport(): void {
    const selection = this.produitsImport.filter(p => p.selectionne);
    if (!selection.length) { this.toastr.warning('Sélectionnez au moins un produit'); return; }

    this.isImporting = true;
    const items = selection.map(p => ({
      produit_id: p.produit.id,
      nom:        p.produit.nom,
      prix_vente: +p.prix_vente,
      categorie:  p.categorie,
    }));

    this.recetteService.importDepuisStock(this.selectedBoutiqueId!, items).subscribe({
      next: (r: any) => {
        this.isImporting = false;
        const m = document.getElementById('modal-import-stock');
        if (m) bootstrap.Modal.getInstance(m)?.hide();
        Swal.fire({
          icon: 'success', title: 'Import terminé',
          text: r?.message ?? `${r?.data?.created} recette(s) créée(s)`,
          timer: 2500, showConfirmButton: false,
        });
        this.loadRecettes();
        // Basculer vers l'onglet boissons après un import
        this.onglet = 'boissons';
      },
      error: (e: any) => { this.isImporting = false; this.toastr.error(e?.error?.message || 'Erreur'); }
    });
  }

  get isAdmin(): boolean {
    const c = this.currentUser?.profil?.code?.toLowerCase();
    return c === 'admin' || c === 'responsable_structure';
  }
}
