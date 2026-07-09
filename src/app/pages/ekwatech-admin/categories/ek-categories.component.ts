import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { AbonnementService } from '../../../services/abonnement/abonnement.service';

const PLAN_LABELS: Record<string, string> = {
  '1_mois': '1 mois', '3_mois': '3 mois', '6_mois': '6 mois', '1_an': '1 an',
};
const PLANS = ['1_mois', '3_mois', '6_mois', '1_an'];

@Component({
  selector: 'app-ek-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ek-categories.component.html',
  providers: [ToastrService],
})
export default class EkCategoriesComponent implements OnInit {
  categories: any[] = [];
  plans = PLANS;
  planLabels = PLAN_LABELS;
  loading = false;

  // Recherche + pagination
  searchQuery = '';
  currentPage = 1;
  readonly pageSize = 5;

  get filteredCategories(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.categories;
    return this.categories.filter(c =>
      c.label?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
    );
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCategories.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get paginatedCategories(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCategories.slice(start, start + this.pageSize);
  }

  onSearch(): void { this.currentPage = 1; }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.currentPage = p;
  }

  // Formulaire catégorie
  showCatForm = false;
  editingCatId: number | null = null;
  isSavingCat = false;
  isDeletingCat: number | null = null;
  catForm = { label: '', description: '', ordre: 0 };

  // Catégorie sélectionnée (tarifs ouverts)
  openedCatId: number | null = null;

  // Formulaire tarif
  tarifForm: Record<string, { montant: number; devise: string; saving: boolean; deleting: boolean }> = {};

  constructor(private abonnementSvc: AbonnementService, private toastr: ToastrService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.abonnementSvc.getCategories()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r: any) => {
          this.categories = r?.data ?? r ?? [];
          this.currentPage = 1;
          this.syncTarifForms();
        },
      });
  }

  syncTarifForms(): void {
    for (const cat of this.categories) {
      for (const plan of PLANS) {
        const existing = (cat.tarifs ?? []).find((t: any) => t.plan === plan);
        const key = `${cat.id}_${plan}`;
        this.tarifForm[key] = {
          montant: existing?.montant ?? 0,
          devise: existing?.devise ?? 'XOF',
          saving: false,
          deleting: false,
        };
      }
    }
  }

  openCatForm(cat?: any): void {
    this.editingCatId = cat?.id ?? null;
    this.catForm = { label: cat?.label ?? '', description: cat?.description ?? '', ordre: cat?.ordre ?? 0 };
    this.showCatForm = true;
  }

  cancelCatForm(): void {
    this.showCatForm = false;
    this.editingCatId = null;
    this.catForm = { label: '', description: '', ordre: 0 };
  }

  saveCat(): void {
    if (!this.catForm.label.trim()) { this.toastr.warning('Le nom de la catégorie est requis'); return; }
    this.isSavingCat = true;
    const obs = this.editingCatId
      ? this.abonnementSvc.updateCategorie(this.editingCatId, this.catForm)
      : this.abonnementSvc.createCategorie(this.catForm);
    obs.pipe(finalize(() => (this.isSavingCat = false))).subscribe({
      next: () => {
        this.toastr.success(this.editingCatId ? 'Catégorie mise à jour' : 'Catégorie créée');
        this.cancelCatForm();
        this.load();
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
    });
  }

  deleteCat(cat: any): void {
    Swal.fire({
      title: `Supprimer "${cat.label}" ?`,
      html: 'Les tarifs associés seront également supprimés.<br>Les structures de cette catégorie ne seront plus associées.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.isDeletingCat = cat.id;
      this.abonnementSvc.deleteCategorie(cat.id)
        .pipe(finalize(() => (this.isDeletingCat = null)))
        .subscribe({
          next: () => { this.toastr.success('Catégorie supprimée'); this.load(); },
          error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
        });
    });
  }

  toggleCat(catId: number): void {
    this.openedCatId = this.openedCatId === catId ? null : catId;
  }

  hasTarif(cat: any, plan: string): boolean {
    return (cat.tarifs ?? []).some((t: any) => t.plan === plan);
  }

  getTarifMontant(cat: any, plan: string): number {
    return (cat.tarifs ?? []).find((t: any) => t.plan === plan)?.montant ?? 0;
  }

  tarifKey(catId: number, plan: string): string {
    return `${catId}_${plan}`;
  }

  saveTarif(catId: number, plan: string): void {
    const key = this.tarifKey(catId, plan);
    const f = this.tarifForm[key];
    if (!f || f.montant < 0) { this.toastr.warning('Montant invalide'); return; }
    f.saving = true;
    this.abonnementSvc.upsertTarifCategorie(catId, { plan, montant: f.montant, devise: f.devise })
      .pipe(finalize(() => (f.saving = false)))
      .subscribe({
        next: () => { this.toastr.success('Tarif enregistré'); this.load(); },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
      });
  }

  deleteTarif(catId: number, plan: string): void {
    const key = this.tarifKey(catId, plan);
    const f = this.tarifForm[key];
    if (!f) return;
    f.deleting = true;
    this.abonnementSvc.deleteTarifCategorie(catId, plan)
      .pipe(finalize(() => (f.deleting = false)))
      .subscribe({
        next: () => { this.toastr.success('Tarif supprimé (tarif par défaut utilisé)'); this.load(); },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
      });
  }

  planLabel(p: string): string { return PLAN_LABELS[p] ?? p; }
}
