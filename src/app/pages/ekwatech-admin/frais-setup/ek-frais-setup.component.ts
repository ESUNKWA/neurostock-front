import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AbonnementService } from '../../../services/abonnement/abonnement.service';

@Component({
  selector: 'app-ek-frais-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ek-frais-setup.component.html',
  providers: [ToastrService],
})
export default class EkFraisSetupComponent implements OnInit {
  items: any[] = [];
  loading = false;
  isSubmitting = false;
  isDeleting: number | null = null;
  isToggling: number | null = null;

  editingId: number | null = null;

  form: { label: string; montant: number; devise: string; ordre: number } = {
    label: '', montant: 0, devise: 'XOF', ordre: 0,
  };

  constructor(private abonnementSvc: AbonnementService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.abonnementSvc.getFraisSetup()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({ next: (r: any) => { this.items = r?.data ?? r ?? []; } });
  }

  resetForm(): void {
    this.editingId = null;
    this.form = { label: '', montant: 0, devise: 'XOF', ordre: 0 };
  }

  startEdit(item: any): void {
    this.editingId = item.id;
    this.form = { label: item.label, montant: item.montant, devise: item.devise ?? 'XOF', ordre: item.ordre ?? 0 };
  }

  save(): void {
    if (!this.form.label.trim()) { this.toastr.warning('Le libellé est obligatoire'); return; }
    if (this.form.montant < 0)   { this.toastr.warning('Le montant doit être positif'); return; }

    this.isSubmitting = true;

    const obs = this.editingId
      ? this.abonnementSvc.updateFraisSetup(this.editingId, {
          label: this.form.label, montant: this.form.montant, ordre: this.form.ordre,
        })
      : this.abonnementSvc.createFraisSetup(this.form);

    obs.pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: () => {
        this.toastr.success(this.editingId ? 'Frais mis à jour' : 'Frais créé');
        this.resetForm();
        this.load();
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
    });
  }

  toggleActif(item: any): void {
    this.isToggling = item.id;
    this.abonnementSvc.updateFraisSetup(item.id, { est_actif: !item.est_actif })
      .pipe(finalize(() => (this.isToggling = null)))
      .subscribe({
        next: () => {
          this.toastr.success(item.est_actif ? 'Frais désactivé' : 'Frais activé');
          this.load();
        },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
      });
  }

  delete(item: any): void {
    if (!confirm(`Supprimer "${item.label}" ?`)) return;
    this.isDeleting = item.id;
    this.abonnementSvc.deleteFraisSetup(item.id)
      .pipe(finalize(() => (this.isDeleting = null)))
      .subscribe({
        next: () => { this.toastr.success('Frais supprimé'); this.load(); },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
      });
  }

  get totalActif(): number {
    return this.items.filter(i => i.est_actif !== false).reduce((s, i) => s + (i.montant ?? 0), 0);
  }
}
