import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, Subject, debounceTime } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AbonnementService } from '../../services/abonnement/abonnement.service';
import { AuthService } from '../../services/auth/auth.service';
import { FactureModalComponent } from '../../components/facture-modal/facture-modal.component';

@Component({
  selector: 'app-mon-abonnement',
  standalone: true,
  imports: [CommonModule, FormsModule, FactureModalComponent],
  templateUrl: './mon-abonnement.component.html',
  providers: [ToastrService],
})
export default class MonAbonnementComponent implements OnInit {
  abonnement: any = null;
  loading = false;
  error: string | null = null;

  // Plans disponibles
  plans: any[] = [];

  // Modal souscription
  showFacture = false;
  showModal = false;
  form = { plan: '', montant: 0, notes: '' };
  devis: any = null;
  devisLoading = false;
  isSubmitting = false;
  private devisTrigger$ = new Subject<string>();

  get structureId(): number | null {
    return this.authService.getUser()?.structure_id ?? null;
  }

  constructor(
    private abonnementSvc: AbonnementService,
    private authService: AuthService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadAbonnement();
    this.loadPlans();

    this.devisTrigger$.pipe(debounceTime(300)).subscribe(plan => {
      this.fetchDevis(plan);
    });
  }

  loadAbonnement(): void {
    this.loading = true;
    this.error = null;
    this.abonnementSvc.getMySubscription()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r: any) => { this.abonnement = r?.data ?? r; },
        error: (e: any) => { this.error = e?.error?.message || 'Impossible de charger l\'abonnement'; },
      });
  }

  loadPlans(): void {
    this.abonnementSvc.getPlans().subscribe({
      next: (r: any) => {
        this.plans = (r?.data ?? []).filter((p: any) => p.plan !== 'essai');
      },
    });
  }

  // ── Modal souscription ─────────────────────────────────────────────────────
  openModal(): void {
    const firstPlan = this.plans[0]?.plan ?? '1_mois';
    this.form = { plan: firstPlan, montant: 0, notes: '' };
    this.devis = null;
    this.showModal = true;
    this.devisTrigger$.next(firstPlan);
  }

  onPlanChange(): void {
    this.devis = null;
    this.form.montant = 0;
    this.devisTrigger$.next(this.form.plan);
  }

  fetchDevis(plan: string): void {
    if (!this.structureId || !plan) return;
    this.devisLoading = true;
    this.abonnementSvc.getDevis(this.structureId, plan)
      .pipe(finalize(() => (this.devisLoading = false)))
      .subscribe({
        next: (r: any) => {
          this.devis = r?.data ?? null;
          if (this.devis) { this.form.montant = this.devis.total; }
        },
        error: () => { this.devis = null; },
      });
  }

  submit(): void {
    if (!this.structureId) { this.toastr.error('Structure introuvable'); return; }
    this.isSubmitting = true;
    this.abonnementSvc.subscribe({
      structureId: this.structureId,
      plan: this.form.plan,
      montant: this.form.montant || undefined,
      notes: this.form.notes || undefined,
    }).pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: (r: any) => {
        this.toastr.success('Abonnement souscrit avec succès !');
        this.showModal = false;
        this.abonnement = r?.data ?? this.abonnement;
        this.loadAbonnement();
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la souscription'),
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  get planLabel(): string { return AbonnementService.planLabel(this.abonnement?.plan ?? ''); }

  planLabelOf(plan: string): string { return AbonnementService.planLabel(plan); }

  get statutClass(): string {
    const map: Record<string, string> = {
      actif: 'border-success text-success',
      expire: 'border-danger text-danger',
      suspendu: 'border-warning text-warning',
    };
    return map[this.abonnement?.statut] ?? 'border-secondary text-secondary';
  }

  get joursClass(): string {
    const j = this.abonnement?.jours_restants;
    if (this.abonnement?.statut !== 'actif') return 'text-muted';
    if (j <= 3) return 'text-danger fw-bold';
    if (j <= 7) return 'text-warning fw-semibold';
    return 'text-success fw-semibold';
  }

  get canSubscribe(): boolean {
    const s = this.abonnement?.statut;
    return !s || s === 'expire' || s === 'actif' || s === 'suspendu';
  }
}
