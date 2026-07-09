import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { StructureService } from '../../../services/structure/structure.service';
import { AbonnementService } from '../../../services/abonnement/abonnement.service';

@Component({
  selector: 'app-ek-structures',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ek-structures.component.html',
  providers: [ToastrService],
})
export default class EkStructuresComponent implements OnInit {
  structures: any[] = [];
  categories: any[] = [];
  loading = false;
  showModal = false;
  isEditMode = false;
  isSubmitting = false;
  editTarget: any = null;

  form: FormGroup;
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  constructor(
    private structureSvc: StructureService,
    private abonnementSvc: AbonnementService,
    private toastr: ToastrService,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      nom:          ['', Validators.required],
      telephone:    ['', [Validators.minLength(10), Validators.maxLength(10)]],
      email:        [''],
      rccm:         [''],
      situation_geo:[''],
      categorieId:  [null],
    });
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => (this.previewUrl = e.target.result);
    reader.readAsDataURL(file);
  }

  ngOnInit(): void {
    this.load();
    this.loadCategories();
  }

  loadCategories(): void {
    this.abonnementSvc.getCategories().subscribe({
      next: (r: any) => { this.categories = r?.data ?? r ?? []; },
    });
  }

  load(): void {
    this.loading = true;
    this.structureSvc.find()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({ next: (r: any) => { this.structures = r?.data ?? (Array.isArray(r) ? r : []); } });
  }

  openCreate(): void {
    this.isEditMode = false;
    this.editTarget = null;
    this.selectedFile = null;
    this.previewUrl = null;
    this.form.reset();
    this.showModal = true;
  }

  openEdit(s: any): void {
    this.isEditMode = true;
    this.editTarget = s;
    this.selectedFile = null;
    this.previewUrl = null;
    this.form.patchValue({
      nom: s.nom,
      telephone: s.telephone,
      email: s.email,
      rccm: s.rccm,
      situation_geo: s.situation_geo,
      categorieId: s.categorieId ?? null,
    });
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const payload = new FormData();
    const v = this.form.value;
    payload.append('nom', v.nom);
    payload.append('email', v.email ?? '');
    if (v.telephone)     payload.append('telephone', v.telephone);
    if (v.rccm)          payload.append('rccm', v.rccm);
    if (v.situation_geo) payload.append('situation_geo', v.situation_geo);
    const catId = v.categorieId ? parseInt(v.categorieId, 10) : null;
    if (catId) payload.append('categorieId', String(catId));
    if (this.selectedFile) payload.append('logo', this.selectedFile);

    this.isSubmitting = true;
    const req = this.isEditMode
      ? this.structureSvc.update(payload, this.editTarget.id)
      : this.structureSvc.create(payload);

    req.pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: () => {
        this.toastr.success(this.isEditMode ? 'Structure modifiée' : 'Structure créée');
        this.showModal = false;
        this.load();
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la sauvegarde'),
    });
  }

  confirmDelete(s: any): void {
    Swal.fire({
      title: `Supprimer "${s.nom}" ?`,
      text: 'Cette action est irréversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.structureSvc.delete(s.id).subscribe({
        next: () => { this.toastr.success('Structure supprimée'); this.load(); },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la suppression'),
      });
    });
  }

  categoryLabel(id: number): string {
    return this.categories.find(c => c.id === id)?.label ?? `#${id}`;
  }

  get f() { return this.form.controls; }
}
