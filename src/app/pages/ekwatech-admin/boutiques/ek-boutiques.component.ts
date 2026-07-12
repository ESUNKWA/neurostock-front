import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { StructureService } from '../../../services/structure/structure.service';
import { SelectedTenantService } from '../../../services/tenant/selected-tenant.service';

interface BoutiqueForm {
  nom: string;
  telephone: string;
  email: string;
  rccm: string;
  situation_geo: string;
  structure: number | null;
  type: 'boutique' | 'restaurant';
}

@Component({
  selector: 'app-ek-boutiques',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ek-boutiques.component.html',
  providers: [ToastrService],
})
export default class EkBoutiquesComponent implements OnInit, OnDestroy {
  boutiques: any[] = [];
  structures: any[] = [];
  selectedStructureId: number | null = null;

  loading = false;
  showModal = false;
  isEditMode = false;
  isSubmitting = false;
  editTarget: any = null;

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
  }

  private setStructure(id: number | null): void {
    this.selectedStructureId = id;
    this.selectedTenant.set(id);
    if (id) this.load();
  }

  load(): void {
    if (!this.selectedStructureId) return;
    this.loading = true;
    this.boutiqueSvc.findByStructure(String(this.selectedStructureId))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({ next: (r: any) => { this.boutiques = r?.data ?? (Array.isArray(r) ? r : []); } });
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
        this.toastr.success(this.isEditMode ? 'Boutique modifiée' : 'Boutique créée');
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
        next: () => { this.toastr.success('Boutique supprimée'); this.load(); },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la suppression'),
      });
    });
  }

  structureName(id: number | null): string {
    return this.structures.find(s => s.id === id)?.nom ?? '—';
  }
}
