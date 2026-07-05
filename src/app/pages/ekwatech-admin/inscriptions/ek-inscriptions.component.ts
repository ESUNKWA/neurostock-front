import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { InscriptionService, ValiderInscriptionDto } from '../../../services/inscription/inscription.service';

@Component({
  selector: 'app-ek-inscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ek-inscriptions.component.html',
  providers: [ToastrService],
})
export default class EkInscriptionsComponent implements OnInit {
  inscriptions: any[] = [];
  loading = false;
  actionLoading: number | null = null;

  /* ── Modal validation ─── */
  showValiderModal = false;
  isValiding = false;
  validerTarget: any = null;
  validerResult: any = null;

  validerForm: ValiderInscriptionDto = {
    host: 'localhost',
    username: 'postgres',
    password: '',
    database: '',
  };

  constructor(
    private inscriptionSvc: InscriptionService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.inscriptionSvc.getAll()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r: any) => { this.inscriptions = r?.data ?? (Array.isArray(r) ? r : []); },
        error: () => { this.inscriptions = []; },
      });
  }

  /* ── Validation ────────────────────────────────────────────── */
  openValider(ins: any): void {
    this.validerTarget = ins;
    this.validerResult = null;
    this.validerForm = {
      host: 'localhost',
      username: 'postgres',
      password: '',
      database: `GESTION_STOCK_${ins.id ?? ''}_DB`,
    };
    this.showValiderModal = true;
  }

  closeValiderModal(): void {
    this.showValiderModal = false;
    this.validerTarget = null;
    this.validerResult = null;
  }

  get validerFormValid(): boolean {
    return !!(this.validerForm.username && this.validerForm.password && this.validerForm.database);
  }

  submitValider(): void {
    if (!this.validerFormValid || !this.validerTarget) return;

    this.isValiding = true;
    this.inscriptionSvc.valider(this.validerTarget.id, this.validerForm)
      .pipe(finalize(() => (this.isValiding = false)))
      .subscribe({
        next: (r: any) => {
          this.validerResult = r?.data ?? r;
          this.toastr.success('Inscription validée avec succès');
          this.load();
        },
        error: (e: any) => {
          this.toastr.error(e?.error?.message || 'Erreur lors de la validation');
        },
      });
  }

  /* ── Rejet ─────────────────────────────────────────────────── */
  rejeter(ins: any): void {
    Swal.fire({
      title: 'Rejeter cette demande ?',
      html: `<strong>${ins.structure_nom}</strong><br>
             <small class="text-muted">Responsable : ${ins.responsable_prenoms || ''} ${ins.responsable_nom}</small>`,
      input: 'textarea',
      inputLabel: 'Motif du rejet (optionnel)',
      inputPlaceholder: 'Saisir un commentaire…',
      inputAttributes: { rows: '3' },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-x-circle me-1"></i> Rejeter',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
    }).then(result => {
      if (!result.isConfirmed) return;

      this.actionLoading = ins.id;
      this.inscriptionSvc.rejeter(ins.id, result.value || undefined)
        .pipe(finalize(() => (this.actionLoading = null)))
        .subscribe({
          next: () => {
            this.toastr.success('Demande rejetée');
            this.load();
          },
          error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors du rejet'),
        });
    });
  }

  /* ── Helpers ───────────────────────────────────────────────── */
  statutClass(statut: string): string {
    const map: Record<string, string> = {
      en_attente: 'bg-warning-subtle text-warning',
      validée:    'bg-success-subtle text-success',
      rejetée:    'bg-danger-subtle text-danger',
    };
    return map[statut] ?? 'bg-secondary-subtle text-secondary';
  }

  statutLabel(statut: string): string {
    const map: Record<string, string> = {
      en_attente: 'En attente',
      validée:    'Validée',
      rejetée:    'Rejetée',
    };
    return map[statut] ?? statut;
  }
}
