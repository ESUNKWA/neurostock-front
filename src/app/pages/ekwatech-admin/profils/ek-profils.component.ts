import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { ProfilService } from '../../../services/profil/profil.service';

interface ProfilForm {
  nom: string;
  code: string;
  description: string;
}

@Component({
  selector: 'app-ek-profils',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ek-profils.component.html',
  providers: [ToastrService],
})
export default class EkProfilsComponent implements OnInit {
  profils: any[] = [];

  loading = false;
  showModal = false;
  isEditMode = false;
  isSubmitting = false;
  editTarget: any = null;

  form: ProfilForm = { nom: '', code: '', description: '' };

  constructor(
    private profilSvc: ProfilService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.profilSvc.find()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({ next: (r: any) => { this.profils = r?.data ?? (Array.isArray(r) ? r : []); } });
  }

  openCreate(): void {
    this.isEditMode = false;
    this.editTarget = null;
    this.form = { nom: '', code: '', description: '' };
    this.showModal = true;
  }

  openEdit(p: any): void {
    this.isEditMode = true;
    this.editTarget = p;
    this.form = {
      nom: p.nom ?? '',
      code: p.code ?? '',
      description: p.description ?? '',
    };
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  submit(): void {
    if (!this.form.nom.trim()) { this.toastr.warning('Le nom est obligatoire'); return; }

    const payload: any = { nom: this.form.nom };
    if (this.form.code.trim())        payload.code = this.form.code.trim();
    if (this.form.description.trim()) payload.description = this.form.description.trim();

    this.isSubmitting = true;
    const req = this.isEditMode
      ? this.profilSvc.update(payload, String(this.editTarget.id))
      : this.profilSvc.create(payload);

    req.pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: () => {
        this.toastr.success(this.isEditMode ? 'Profil modifié' : 'Profil créé');
        this.showModal = false;
        this.load();
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la sauvegarde'),
    });
  }

  confirmDelete(p: any): void {
    Swal.fire({
      title: `Supprimer "${p.nom}" ?`,
      text: 'Cette action est irréversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.profilSvc.delete(String(p.id)).subscribe({
        next: () => { this.toastr.success('Profil supprimé'); this.load(); },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la suppression'),
      });
    });
  }
}
