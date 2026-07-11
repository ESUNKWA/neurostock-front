import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { MenuJourService } from '../../../services/restaurant/menu-jour.service';
import { RecetteService } from '../../../services/restaurant/recette.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { AuthService } from '../../../services/auth/auth.service';

declare var bootstrap: any;

@Component({
  selector: 'app-menu-jour',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule],
  templateUrl: './menu-jour.component.html',
  providers: [ToastrService],
})
export default class MenuJourComponent implements OnInit {
  menus: any[] = [];
  recettes: any[] = [];
  boutiques: any[] = [];
  currentUser: any;

  selectedBoutiqueId: number | null = null;
  isLoading = false;
  isSaving = false;

  // Recherche + pagination
  recherche = '';
  readonly parPage = 9;
  pageMenus = 1;

  // Modal état
  editingMenu: any = null;   // null = création, objet = édition
  dateCreation: string = '';
  recettesSelectionnees: number[] = [];

  // Catégories considérées comme boissons (non incluses dans le menu du jour)
  readonly CATS_BOISSONS = ['Boissons', 'Alcools', 'Cocktails'];

  constructor(
    private menuJourService: MenuJourService,
    private recetteService: RecetteService,
    private boutiqueService: BoutiqueService,
    private authService: AuthService,
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
        if (this.selectedBoutiqueId) { this.loadMenus(); this.loadRecettes(); }
      }
    });
  }

  loadBoutiques(): void {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    const autoSelect = (list: any[]) => {
      this.boutiques = list;
      if (!this.selectedBoutiqueId && list.length) {
        this.selectedBoutiqueId = list[0].id;
        this.loadMenus();
        this.loadRecettes();
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

  onBoutiqueChange(): void { this.loadMenus(); this.loadRecettes(); }

  loadMenus(): void {
    if (!this.selectedBoutiqueId) { this.menus = []; return; }
    this.isLoading = true;
    this.menuJourService.getAll(this.selectedBoutiqueId).subscribe({
      next: (r: any) => { this.menus = r?.data ?? []; this.isLoading = false; this.pageMenus = 1; },
      error: () => { this.menus = []; this.isLoading = false; }
    });
  }

  get menusFiltres(): any[] {
    const q = this.recherche.trim().toLowerCase();
    if (!q) return this.menus;
    return this.menus.filter(m =>
      this.formatDate(m.date).toLowerCase().includes(q) ||
      (m.recettes ?? []).some((r: any) => r.nom.toLowerCase().includes(q))
    );
  }

  get totalPagesMenus(): number { return Math.max(1, Math.ceil(this.menusFiltres.length / this.parPage)); }

  get menusPagines(): any[] {
    const s = (this.pageMenus - 1) * this.parPage;
    return this.menusFiltres.slice(s, s + this.parPage);
  }

  pagesArray(total: number): number[] { return Array.from({ length: total }, (_, i) => i + 1); }

  onRechercheChange(): void { this.pageMenus = 1; }

  loadRecettes(): void {
    if (!this.selectedBoutiqueId) return;
    this.recetteService.getAll(this.selectedBoutiqueId).subscribe({
      next: (r: any) => {
        // Seuls les plats (pas les boissons) font partie du menu du jour
        this.recettes = (r?.data ?? []).filter((rec: any) =>
          rec.actif && !this.CATS_BOISSONS.includes(rec.categorie)
        );
      }
    });
  }

  // ---- Groupement par catégorie ----

  recettesParCategorie(): { cat: string; items: any[] }[] {
    const map = new Map<string, any[]>();
    for (const r of this.recettes) {
      const cat = r.categorie || 'Autres';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }
    return Array.from(map.entries()).map(([cat, items]) => ({ cat, items }));
  }

  // ---- Ouvrir modal création ----

  ouvrirCreation(): void {
    this.editingMenu = null;
    this.dateCreation = new Date().toISOString().split('T')[0];
    this.recettesSelectionnees = [];
    if (isPlatformBrowser(this.platformId)) {
      const m = document.getElementById('modal-menu-jour');
      if (m) new bootstrap.Modal(m).show();
    }
  }

  // ---- Ouvrir modal édition ----

  ouvrirEdition(menu: any): void {
    this.editingMenu = menu;
    this.dateCreation = menu.date;
    this.recettesSelectionnees = (menu.recettes ?? []).map((r: any) => r.id);
    if (isPlatformBrowser(this.platformId)) {
      const m = document.getElementById('modal-menu-jour');
      if (m) new bootstrap.Modal(m).show();
    }
  }

  // ---- Toggle sélection recette ----

  toggleRecette(id: number): void {
    const idx = this.recettesSelectionnees.indexOf(id);
    if (idx >= 0) { this.recettesSelectionnees.splice(idx, 1); }
    else { this.recettesSelectionnees.push(id); }
  }

  isSelected(id: number): boolean {
    return this.recettesSelectionnees.includes(id);
  }

  toutSelectionner(): void {
    this.recettesSelectionnees = this.recettes.map(r => r.id);
  }

  toutDeselectionner(): void {
    this.recettesSelectionnees = [];
  }

  // ---- Sauvegarder ----

  sauvegarder(): void {
    if (!this.dateCreation) { this.toastr.warning('Sélectionnez une date'); return; }
    if (this.recettesSelectionnees.length === 0) {
      this.toastr.warning('Sélectionnez au moins un plat'); return;
    }

    this.isSaving = true;
    const obs = this.editingMenu
      ? this.menuJourService.update(this.editingMenu.id, this.recettesSelectionnees)
      : this.menuJourService.create({
          boutique:  this.selectedBoutiqueId!,
          date:      this.dateCreation,
          recettes:  this.recettesSelectionnees,
        });

    obs.subscribe({
      next: () => {
        this.isSaving = false;
        const m = document.getElementById('modal-menu-jour');
        if (m) bootstrap.Modal.getInstance(m)?.hide();
        this.toastr.success(this.editingMenu ? 'Menu mis à jour' : 'Menu créé');
        this.loadMenus();
      },
      error: (e: any) => { this.isSaving = false; this.toastr.error(e?.error?.message || 'Erreur'); }
    });
  }

  // ---- Supprimer ----

  async supprimer(menu: any): Promise<void> {
    const r = await Swal.fire({
      title: `Supprimer le menu du ${this.formatDate(menu.date)} ?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
    });
    if (!r.isConfirmed) return;
    this.menuJourService.remove(menu.id).subscribe({
      next: () => { this.toastr.success('Menu supprimé'); this.loadMenus(); },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur')
    });
  }

  // ---- Helpers ----

  formatDate(d: string): string {
    return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  isToday(d: string): boolean {
    return d === new Date().toISOString().split('T')[0];
  }

  get isAdmin(): boolean {
    const c = this.currentUser?.profil?.code?.toLowerCase();
    return c === 'admin' || c === 'responsable_structure';
  }
}
