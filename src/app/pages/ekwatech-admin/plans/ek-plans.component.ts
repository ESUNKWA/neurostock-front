import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AbonnementService } from '../../../services/abonnement/abonnement.service';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-ek-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule],
  templateUrl: './ek-plans.component.html',
  providers: [ToastrService],
})
export default class EkPlansComponent implements OnInit {
  plans: any[] = [];
  loading = false;
  isSubmitting = false;

  // Prix boutique supplémentaire
  prixBoutique: { valeur: number; type: string } | null = null;
  prixBoutiqueForm: { valeur: number; type: 'pourcentage' | 'montant' } = { valeur: 0, type: 'montant' };
  isSavingPrixBoutique = false;

  readonly PLAN_OPTIONS = [
    { value: '1_mois', label: '1 mois' },
    { value: '3_mois', label: '3 mois' },
    { value: '6_mois', label: '6 mois' },
    { value: '1_an',   label: '1 an' },
  ];

  form = { plan: '1_mois', montant: 0, devise: 'XOF' };

  constructor(private abonnementSvc: AbonnementService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.load();
    this.loadPrixBoutique();
  }

  load(): void {
    this.loading = true;
    this.abonnementSvc.getPlans()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({ next: (r: any) => { this.plans = r?.data ?? []; } });
  }

  loadPrixBoutique(): void {
    this.abonnementSvc.getPrixBoutique().subscribe({
      next: (r: any) => {
        this.prixBoutique = r?.data ?? null;
        if (this.prixBoutique) {
          this.prixBoutiqueForm = {
            valeur: this.prixBoutique.valeur,
            type:   (this.prixBoutique.type as 'pourcentage' | 'montant') ?? 'montant',
          };
        }
      },
    });
  }

  editPlan(p: any): void {
    this.form = { plan: p.plan, montant: p.montant, devise: p.devise ?? 'XOF' };
  }

  save(): void {
    if (!this.form.montant) { this.toastr.warning('Le montant est obligatoire'); return; }
    this.isSubmitting = true;
    this.abonnementSvc.savePlan(this.form)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => { this.toastr.success('Plan mis à jour'); this.load(); },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
      });
  }

  savePrixBoutique(): void {
    if (this.prixBoutiqueForm.valeur == null || this.prixBoutiqueForm.valeur < 0) {
      this.toastr.warning('La valeur est obligatoire'); return;
    }
    if (this.prixBoutiqueForm.type === 'pourcentage' && this.prixBoutiqueForm.valeur > 100) {
      this.toastr.warning('Le pourcentage ne peut pas dépasser 100'); return;
    }
    this.isSavingPrixBoutique = true;
    this.abonnementSvc.savePrixBoutique(this.prixBoutiqueForm)
      .pipe(finalize(() => (this.isSavingPrixBoutique = false)))
      .subscribe({
        next: () => { this.toastr.success('Prix point de vente mis à jour'); this.loadPrixBoutique(); },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
      });
  }

  planLabel(p: string): string {
    return this.PLAN_OPTIONS.find(o => o.value === p)?.label ?? p;
  }
}
