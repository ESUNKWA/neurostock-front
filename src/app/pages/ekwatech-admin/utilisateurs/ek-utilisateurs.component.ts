import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { HttpClientService } from '../../../services/http-client/http-client.service';
import { environnement } from '../../../environnement/environnement';

interface UserForm {
  nom: string;
  prenoms: string;
  telephone: string;
  email: string;
  mot_de_passe: string;
  profil_id: number | null;
  structure_id: number | null;
  boutique_id: number | null;
}

@Component({
  selector: 'app-ek-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ek-utilisateurs.component.html',
})
export default class EkUtilisateursComponent implements OnInit {
  private http   = inject(HttpClientService);
  private toastr = inject(ToastrService);
  private readonly API = environnement.API_URL;

  users: any[]      = [];
  structures: any[] = [];
  profils: any[]    = [];
  boutiques: any[]  = [];

  loading          = false;
  saving           = false;
  loadingBoutiques = false;

  editingUser: any | null = null;
  get isEditMode(): boolean { return this.editingUser !== null; }

  form: UserForm = this.emptyForm();

  private emptyForm(): UserForm {
    return { nom: '', prenoms: '', telephone: '', email: '', mot_de_passe: '', profil_id: null, structure_id: null, boutique_id: null };
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadStructures();
    this.loadProfils();
  }

  loadUsers(): void {
    this.loading = true;
    this.http.get(`${this.API}/utilisateur`).subscribe({
      next: (r: any) => { this.users = r?.data ?? (Array.isArray(r) ? r : []); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  loadStructures(): void {
    this.http.get(`${this.API}/structure`).subscribe({
      next: (r: any) => { this.structures = r?.data ?? (Array.isArray(r) ? r : []); },
    });
  }

  loadProfils(): void {
    this.http.get(`${this.API}/profil`).subscribe({
      next: (r: any) => { this.profils = r?.data ?? (Array.isArray(r) ? r : []); },
    });
  }

  onStructureChange(): void {
    this.form.boutique_id = null;
    this.boutiques = [];
    if (!this.form.structure_id) return;
    this.loadingBoutiques = true;
    this.http.get(`${this.API}/boutique?structure=${this.form.structure_id}`).subscribe({
      next: (r: any) => { this.boutiques = r?.data ?? (Array.isArray(r) ? r : []); this.loadingBoutiques = false; },
      error: () => { this.loadingBoutiques = false; },
    });
  }

  structureName(id: number | null): string {
    if (!id) return '—';
    return this.structures.find(s => s.id === id)?.nom ?? `#${id}`;
  }

  edit(user: any): void {
    this.editingUser = user;
    this.form = {
      nom:          user.nom      ?? '',
      prenoms:      user.prenoms  ?? '',
      telephone:    user.telephone ?? '',
      email:        user.email    ?? '',
      mot_de_passe: '',
      profil_id:    user.profil?.id ?? null,
      structure_id: user.structure_id ?? null,
      boutique_id:  user.boutique_id  ?? null,
    };
    if (user.structure_id) this.onStructureChange();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancel(): void {
    this.editingUser = null;
    this.form = this.emptyForm();
    this.boutiques = [];
  }

  save(): void {
    if (!this.form.nom || !this.form.prenoms || !this.form.telephone || !this.form.profil_id) {
      this.toastr.warning('Nom, prénoms, téléphone et profil sont obligatoires');
      return;
    }
    this.saving = true;

    if (this.isEditMode) {
      const payload: any = {
        nom:          this.form.nom,
        prenoms:      this.form.prenoms,
        telephone:    this.form.telephone,
        email:        this.form.email || null,
        profil:       this.form.profil_id,
        structure_id: this.form.structure_id,
        boutique:     this.form.boutique_id,
      };
      this.http.patch(`${this.API}/utilisateur/${this.editingUser.id}`, payload).subscribe({
        next: () => { this.toastr.success('Utilisateur modifié'); this.cancel(); this.saving = false; this.loadUsers(); },
        error: (err: any) => { this.toastr.error(err?.error?.message || 'Erreur'); this.saving = false; },
      });
    } else {
      const payload: any = {
        nom:          this.form.nom,
        prenoms:      this.form.prenoms,
        telephone:    this.form.telephone,
        email:        this.form.email || null,
        profil:       this.form.profil_id,
        structure_id: this.form.structure_id,
        boutique:     this.form.boutique_id,
      };
      if (this.form.mot_de_passe) payload.mot_de_passe = this.form.mot_de_passe;

      this.http.post(`${this.API}/utilisateur`, payload).subscribe({
        next: () => { this.toastr.success('Utilisateur créé'); this.cancel(); this.saving = false; this.loadUsers(); },
        error: (err: any) => { this.toastr.error(err?.error?.message || 'Erreur'); this.saving = false; },
      });
    }
  }

  resetPassword(user: any): void {
    Swal.fire({
      title: 'Réinitialiser le mot de passe ?',
      text: `Le mot de passe de ${user.nom} ${user.prenoms} sera remis au mot de passe par défaut.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Réinitialiser',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#f59e0b',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.http.patch(`${this.API}/utilisateur/${user.id}/reset-mot-de-passe`, {}).subscribe({
        next: () => this.toastr.success('Mot de passe réinitialisé'),
        error: () => this.toastr.error('Erreur lors de la réinitialisation'),
      });
    });
  }

  remove(user: any): void {
    Swal.fire({
      title: 'Supprimer cet utilisateur ?',
      html: `<strong>${user.nom} ${user.prenoms}</strong><br><small class="text-muted">${user.telephone ?? ''}</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#ef4444',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.http.delete(`${this.API}/utilisateur/${user.id}`).subscribe({
        next: () => { this.toastr.success('Utilisateur supprimé'); this.loadUsers(); },
        error: () => this.toastr.error('Erreur lors de la suppression'),
      });
    });
  }
}
