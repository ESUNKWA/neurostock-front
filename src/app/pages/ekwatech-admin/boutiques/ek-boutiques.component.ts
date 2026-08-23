import { Component, inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { StructureService } from '../../../services/structure/structure.service';
import { SelectedTenantService } from '../../../services/tenant/selected-tenant.service';

import { NzSelectModule } from 'ng-zorro-antd/select';

declare var $: any;

interface BoutiqueForm {
  nom: string;
  telephone: string;
  email: string;
  rccm: string;
  situation_geo: string;
  structure: number | null;
  type: 'boutique' | 'entrepot';
}

const ALL_MODES = [
  { value: 'espece',      label: 'Espèces',      icon: 'bi-cash-coin' },
  { value: 'orange_money',label: 'Orange Money', icon: 'bi-phone' },
  { value: 'wave',        label: 'Wave',         icon: 'bi-phone' },
  { value: 'mtn_money',   label: 'MTN Money',    icon: 'bi-phone' },
  { value: 'moov_money',  label: 'Moov Money',   icon: 'bi-phone' },
  { value: 'dajmo',       label: 'Dajmo',        icon: 'bi-phone' },
  { value: 'carte',       label: 'Carte',        icon: 'bi-credit-card' },
  { value: 'credit',      label: 'Crédit',       icon: 'bi-clock-history' },
  { value: 'mixte',       label: 'Mixte',        icon: 'bi-layers' },
];

@Component({
  selector: 'app-ek-boutiques',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule],
  templateUrl: './ek-boutiques.component.html',
  providers: [ToastrService],
})
export default class EkBoutiquesComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);

  boutiques: any[] = [];
  structures: any[] = [];
  selectedStructureId: number | null = null;

  loading = false;
  showModal = false;
  isEditMode = false;
  isSubmitting = false;
  editTarget: any = null;

  readonly ALL_MODES = ALL_MODES;
  showModesModal = false;
  modesBoutique: any = null;
  modesSelectionnes: string[] = [];
  modesSaving = false;

  form: BoutiqueForm = { nom: '', telephone: '', email: '', rccm: '', situation_geo: '', structure: null, type: 'boutique' };

  constructor(
    private boutiqueSvc: BoutiqueService,
    private structureSvc: StructureService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private selectedTenant: SelectedTenantService,
  ) {}

  ngOnInit(): void {
    this.structureSvc.find().subscribe({
      next: (r: any) => {
        this.structures = r?.data ?? (Array.isArray(r) ? r : []);
        this.route.queryParams.subscribe(p => {
          const id = p['structure'] ? +p['structure'] : (this.structures[0]?.id ?? null);
          this.setStructure(id);
        });
      },
    });
  }

  ngOnDestroy(): void {
    this.selectedTenant.clear();
    this.destroyDt();
  }

  private setStructure(id: number | null): void {
    this.selectedStructureId = id;
    this.selectedTenant.set(id);
    if (id) this.load();
  }

  load(): void {
    if (!this.selectedStructureId) return;
    this.loading = true;
    this.destroyDt();
    this.boutiqueSvc.findByStructure(String(this.selectedStructureId))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r: any) => {
          this.boutiques = r?.data ?? (Array.isArray(r) ? r : []);
          setTimeout(() => this.initDt(), 100);
        },
      });
  }

  private destroyDt(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const t = $('.js-dt-boutiques');
        if ($.fn?.DataTable?.isDataTable(t)) t.DataTable().destroy();
      } catch {}
    }
  }

  private initDt(): void {
    if (isPlatformBrowser(this.platformId) && this.boutiques.length) {
      try {
        const t = $('.js-dt-boutiques');
        if (!$.fn?.DataTable?.isDataTable(t)) {
          t.DataTable({ pageLength: 10, order: [[0, 'desc']], language: { url: 'assets/i18n/fr-FR.json' } });
        }
      } catch {}
    }
  }

  onStructureChange(): void {
    this.selectedTenant.set(this.selectedStructureId);
    this.load();
  }

  openCreate(): void {
    this.isEditMode = false;
    this.editTarget = null;
    this.form = { nom: '', telephone: '', email: '', rccm: '', situation_geo: '', structure: this.selectedStructureId, type: 'boutique' };
    this.showModal = true;
  }

  openEdit(b: any): void {
    this.isEditMode = true;
    this.editTarget = b;
    this.form = {
      nom: b.nom ?? '',
      telephone: b.telephone ?? '',
      email: b.email ?? '',
      rccm: b.rccm ?? '',
      situation_geo: b.situation_geo ?? '',
      structure: b.structure?.id ?? this.selectedStructureId,
      type: b.type ?? 'boutique',
    };
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  submit(): void {
    if (!this.form.nom.trim()) { this.toastr.warning('Le nom est obligatoire'); return; }
    if (!this.form.structure)  { this.toastr.warning('Sélectionnez une structure'); return; }
    if (this.form.telephone && this.form.telephone.replace(/\s/g, '').length !== 10) {
      this.toastr.warning('Le numéro de téléphone doit contenir exactement 10 chiffres');
      return;
    }

    const payload = new FormData();
    payload.append('nom', this.form.nom);
    payload.append('structure', String(this.form.structure));
    payload.append('type', this.form.type);
    if (this.form.telephone)    payload.append('telephone', this.form.telephone);
    if (this.form.email)        payload.append('email', this.form.email);
    if (this.form.rccm)         payload.append('rccm', this.form.rccm);
    if (this.form.situation_geo) payload.append('situation_geo', this.form.situation_geo);

    this.isSubmitting = true;
    const req = this.isEditMode
      ? this.boutiqueSvc.update(payload, this.editTarget.id)
      : this.boutiqueSvc.create(payload);

    req.pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: () => {
        this.toastr.success(this.isEditMode ? 'Point de vente modifié' : 'Point de vente créé');
        this.showModal = false;
        this.load();
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la sauvegarde'),
    });
  }

  confirmDelete(b: any): void {
    Swal.fire({
      title: `Supprimer "${b.nom}" ?`,
      text: 'Cette action est irréversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.boutiqueSvc.delete(b.id).subscribe({
        next: () => { this.toastr.success('Point de vente supprimé'); this.load(); },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la suppression'),
      });
    });
  }

  structureName(id: number | null): string {
    return this.structures.find(s => s.id === id)?.nom ?? '—';
  }

  openModesPaiement(b: any): void {
    this.modesBoutique = b;
    this.modesSelectionnes = Array.isArray(b.modes_paiement) && b.modes_paiement.length
      ? [...b.modes_paiement]
      : ALL_MODES.map(m => m.value);
    this.showModesModal = true;
  }

  closeModesModal(): void { this.showModesModal = false; }

  toggleMode(value: string): void {
    const idx = this.modesSelectionnes.indexOf(value);
    if (idx >= 0) this.modesSelectionnes.splice(idx, 1);
    else this.modesSelectionnes.push(value);
  }

  isModeSelected(value: string): boolean {
    return this.modesSelectionnes.includes(value);
  }

  saveModesPaiement(): void {
    if (!this.modesSelectionnes.length) {
      this.toastr.warning('Sélectionnez au moins un mode de paiement');
      return;
    }
    this.modesSaving = true;
    this.boutiqueSvc.updateModesPaiement(this.modesBoutique.id, this.modesSelectionnes, this.selectedStructureId ?? undefined)
      .pipe(finalize(() => (this.modesSaving = false)))
      .subscribe({
        next: () => {
          this.modesBoutique.modes_paiement = [...this.modesSelectionnes];
          this.toastr.success('Modes de paiement mis à jour');
          this.showModesModal = false;
        },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la mise à jour'),
      });
  }

  boutiqueType(b: any): 'boutique' | 'entrepot' {
    const t = (b.type ?? '').toString().toLowerCase().trim();
    if (t === 'entrepot' || t === 'entrepôt' || t === 'warehouse') return 'entrepot';
    return 'boutique';
  }
}
