import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { CaisseService } from '../../../services/gestion-des-caisses/caisse.service';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { NzSelectModule } from 'ng-zorro-antd/select';

declare var bootstrap: any;

@Component({
  selector: 'app-caisses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NzSelectModule],
  templateUrl: './caisses.component.html',
  styleUrl: './caisses.component.scss',
})
export default class CaissesComponent implements OnInit {
  currentUser: any;
  boutiques:   any[] = [];
  idBoutique:  number | null = null;

  caisses:     any[] = [];
  loading     = false;
  submitting  = false;
  migrating   = false;

  editingId:  number | null = null;
  form!: FormGroup;

  constructor(
    private fb:           FormBuilder,
    private caisseSvc:    CaisseService,
    private authService:  AuthService,
    private boutiqueSvc:  BoutiqueService,
    private toastr:       ToastrService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      if (user) {
        this.loadBoutiques();
        const boutiqueId = user.boutique_id ?? user.boutique?.id;
        if (boutiqueId) {
          this.idBoutique = boutiqueId;
          this.load();
        }
      }
    });
  }

  initForm(caisse?: any): void {
    this.form = this.fb.group({
      nom:         [caisse?.nom        ?? '', [Validators.required, Validators.maxLength(100)]],
      code:        [caisse?.code       ?? '', [Validators.required, Validators.maxLength(20)]],
      description: [caisse?.description ?? ''],
      emplacement: [caisse?.emplacement ?? ''],
    });
  }

  loadBoutiques(): void {
    if (this.currentUser?.is_admin) {
      this.boutiqueSvc.find().subscribe({ next: (r: any) => { this.boutiques = r?.data ?? []; } });
    } else if (this.currentUser?.profil?.code === 'responsable_structure') {
      this.boutiqueSvc.findByStructure(this.currentUser.structure_id).subscribe({ next: (r: any) => { this.boutiques = r?.data ?? []; } });
    } else {
      this.boutiques = this.currentUser?.boutique ? [this.currentUser.boutique] : [];
    }
  }

  onBoutiqueChange(): void {
    this.caisses = [];
    if (this.idBoutique) this.load();
  }

  load(): void {
    if (!this.idBoutique) return;
    this.loading = true;
    this.caisseSvc.getCaisses(this.idBoutique)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r: any) => { this.caisses = r?.data ?? r ?? []; },
        error: () => { this.caisses = []; },
      });
  }

  openCreate(): void {
    this.editingId = null;
    this.initForm();
    const m = document.getElementById('modal-caisse');
    if (m) (bootstrap.Modal.getInstance(m) ?? new bootstrap.Modal(m)).show();
  }

  openEdit(caisse: any): void {
    this.editingId = caisse.id;
    this.initForm(caisse);
    const m = document.getElementById('modal-caisse');
    if (m) (bootstrap.Modal.getInstance(m) ?? new bootstrap.Modal(m)).show();
  }

  submit(): void {
    if (this.form.invalid || !this.idBoutique) return;
    this.submitting = true;
    const body = { ...this.form.value, boutique: this.idBoutique };

    const req$ = this.editingId
      ? this.caisseSvc.updateCaisse(this.editingId, body)
      : this.caisseSvc.createCaisse(body);

    req$.pipe(finalize(() => (this.submitting = false))).subscribe({
      next: () => {
        this.toastr.success(this.editingId ? 'Caisse mise à jour' : 'Caisse créée');
        bootstrap.Modal.getInstance(document.getElementById('modal-caisse'))?.hide();
        this.load();
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
    });
  }

  toggleStatut(caisse: any): void {
    this.caisseSvc.toggleCaisseStatut(caisse.id).subscribe({
      next: () => { this.load(); },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
    });
  }

  delete(caisse: any): void {
    Swal.fire({
      title: `Supprimer "${caisse.nom}" ?`,
      text: 'Cette action est irréversible.',
      icon: 'warning',
      showCancelButton:   true,
      confirmButtonText:  'Supprimer',
      cancelButtonText:   'Annuler',
      confirmButtonColor: '#dc3545',
    }).then(res => {
      if (!res.isConfirmed) return;
      this.caisseSvc.deleteCaisse(caisse.id).subscribe({
        next: () => { this.toastr.success('Caisse supprimée'); this.load(); },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Impossible de supprimer'),
      });
    });
  }

  migrer(): void {
    if (!this.idBoutique || this.migrating) return;
    Swal.fire({
      title: 'Migrer les sessions ?',
      html: 'Les sessions sans caisse associée seront rattachées à une <b>Caisse principale</b> automatiquement créée.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Migrer',
      cancelButtonText: 'Annuler',
    }).then(res => {
      if (!res.isConfirmed) return;
      this.migrating = true;
      this.caisseSvc.migrerCaisses(this.idBoutique!)
        .pipe(finalize(() => (this.migrating = false)))
        .subscribe({
          next: (r: any) => { this.toastr.success(r?.message ?? 'Migration terminée'); this.load(); },
          error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur de migration'),
        });
    });
  }

  get isSuperUser(): boolean {
    const code = this.currentUser?.profil?.code;
    return code === 'admin' || code === 'responsable_structure' || this.currentUser?.is_admin === true;
  }
}
