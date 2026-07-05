import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { AbonnementService } from '../../../services/abonnement/abonnement.service';
import { StructureService } from '../../../services/structure/structure.service';
import { FactureModalComponent } from '../../../components/facture-modal/facture-modal.component';

@Component({
  selector: 'app-ek-abonnements',
  standalone: true,
  imports: [CommonModule, FormsModule, FactureModalComponent],
  templateUrl: './ek-abonnements.component.html',
  providers: [ToastrService],
})
export default class EkAbonnementsComponent implements OnInit {
  abonnements: any[] = [];
  structures: any[] = [];
  plans: any[] = [];
  loading = false;
  actionLoading: number | null = null;

  // Modal souscrire
  showModal = false;
  isSubmitting = false;
  form = { structureId: null as number | null, plan: '1_mois', montant: 0, notes: '' };

  // Devis (calculé automatiquement)
  devis: any = null;
  devisLoading = false;
  private devisTrigger$ = new Subject<void>();

  // Modal boutiques facturées
  showBoutiquesModal = false;
  boutiquesModalStructureId: number | null = null;
  boutiquesModalNom = '';
  boutiques: any[] = [];
  boutiquesLoading = false;
  isSyncing = false;
  syncResult: { ajoutees: number; deja_presentes: number } | null = null;
  retirerLoading: number | null = null;
  toggleLoading: number | null = null;

  // Facture
  factureAbonnementId: number | null = null;

  // Modal essai
  showTrialModal = false;
  trialStructureId: number | null = null;
  isStartingTrial = false;

  readonly PLAN_LABELS: Record<string, string> = {
    essai: "Essai", '1_mois': '1 mois', '3_mois': '3 mois', '6_mois': '6 mois', '1_an': '1 an',
  };

  constructor(
    private abonnementSvc: AbonnementService,
    private structureSvc: StructureService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadStructures();
    this.loadPlans();

    // Déclenche le calcul de devis avec debounce
    this.devisTrigger$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.fetchDevis();
    });
  }

  load(): void {
    this.loading = true;
    this.abonnementSvc.getAll()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({ next: (r: any) => { this.abonnements = r?.data ?? []; } });
  }

  loadStructures(): void {
    this.structureSvc.find().subscribe({
      next: (r: any) => { this.structures = r?.data ?? (Array.isArray(r) ? r : []); },
    });
  }

  loadPlans(): void {
    this.abonnementSvc.getPlans().subscribe({
      next: (r: any) => { this.plans = r?.data ?? []; },
    });
  }

  // ── Devis ─────────────────────────────────────────────────────────────────────
  onFormChange(): void {
    this.devis = null;
    if (this.form.structureId && this.form.plan) {
      this.devisTrigger$.next();
    }
  }

  fetchDevis(): void {
    if (!this.form.structureId || !this.form.plan) return;
    this.devisLoading = true;
    this.abonnementSvc.getDevis(this.form.structureId, this.form.plan)
      .pipe(finalize(() => (this.devisLoading = false)))
      .subscribe({
        next: (r: any) => {
          this.devis = r?.data ?? null;
          if (this.devis) { this.form.montant = this.devis.total; }
        },
        error: () => { this.devis = null; },
      });
  }

  // ── Modal souscrire ────────────────────────────────────────────────────────
  openSubscribeModal(ab?: any): void {
    this.devis = null;
    this.form = {
      structureId: ab?.structureId ?? null,
      plan: '1_mois',
      montant: 0,
      notes: '',
    };
    this.showModal = true;
    if (this.form.structureId) { this.fetchDevis(); }
  }

  submitSubscription(): void {
    if (!this.form.structureId) { this.toastr.warning('Sélectionnez une structure'); return; }
    this.isSubmitting = true;
    this.abonnementSvc.subscribe({
      structureId: this.form.structureId,
      plan: this.form.plan,
      montant: this.form.montant || undefined,
      notes: this.form.notes || undefined,
    }).pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: () => {
        this.toastr.success('Abonnement souscrit avec succès');
        this.showModal = false;
        this.load();
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la souscription'),
    });
  }

  // ── Boutiques facturées ────────────────────────────────────────────────────
  openBoutiquesModal(ab: any): void {
    this.boutiquesModalStructureId = ab.structureId;
    this.boutiquesModalNom = this.structureName(ab.structureId);
    this.boutiques = [];
    this.syncResult = null;
    this.showBoutiquesModal = true;
    this.loadBoutiques();
  }

  loadBoutiques(): void {
    if (!this.boutiquesModalStructureId) return;
    this.boutiquesLoading = true;
    this.abonnementSvc.getBoutiques(this.boutiquesModalStructureId)
      .pipe(finalize(() => (this.boutiquesLoading = false)))
      .subscribe({
        next: (r: any) => { this.boutiques = r?.data ?? []; },
        error: () => { this.boutiques = []; },
      });
  }

  toggleBoutiqueActive(b: any): void {
    if (!this.boutiquesModalStructureId) return;
    const action = b.est_active ? 'désactiver' : 'activer';
    const label  = b.est_active ? 'Désactiver' : 'Activer';
    Swal.fire({
      title: `${label} cette boutique ?`,
      html: b.est_active
        ? `<strong>${b.boutiqueNom}</strong> ne sera plus facturée au prochain renouvellement.`
        : `<strong>${b.boutiqueNom}</strong> sera à nouveau facturée au prochain renouvellement.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: label,
      cancelButtonText: 'Annuler',
      confirmButtonColor: b.est_active ? '#f59e0b' : '#22c55e',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.toggleLoading = b.boutiqueId;
      const call = b.est_active
        ? this.abonnementSvc.desactiverBoutique(this.boutiquesModalStructureId!, b.boutiqueId)
        : this.abonnementSvc.activerBoutique(this.boutiquesModalStructureId!, b.boutiqueId);
      call.pipe(finalize(() => (this.toggleLoading = null))).subscribe({
        next: (res: any) => {
          const updated = res?.data;
          if (updated) {
            const idx = this.boutiques.findIndex(x => x.boutiqueId === b.boutiqueId);
            if (idx !== -1) { this.boutiques[idx] = { ...this.boutiques[idx], ...updated }; }
          }
          this.toastr.success(`Boutique ${action === 'désactiver' ? 'désactivée' : 'activée'}`);
          this.load();
        },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
      });
    });
  }

  retirerBoutique(b: any): void {
    if (!this.boutiquesModalStructureId) return;
    Swal.fire({
      title: 'Retirer cette boutique ?',
      html: `<strong>${b.boutiqueNom}</strong> ne sera plus comptée dans les prochains renouvellements.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Retirer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.retirerLoading = b.boutiqueId;
      this.abonnementSvc.retirerBoutique(this.boutiquesModalStructureId!, b.boutiqueId)
        .pipe(finalize(() => (this.retirerLoading = null)))
        .subscribe({
          next: () => {
            this.toastr.success('Boutique retirée de la facturation');
            this.syncResult = null;
            this.loadBoutiques();
            this.load();
          },
          error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
        });
    });
  }

  syncBoutiques(): void {
    if (!this.boutiquesModalStructureId) return;
    this.isSyncing = true;
    this.syncResult = null;
    this.abonnementSvc.syncBoutiques(this.boutiquesModalStructureId)
      .pipe(finalize(() => (this.isSyncing = false)))
      .subscribe({
        next: (r: any) => {
          const d = r?.data ?? {};
          this.syncResult = { ajoutees: d.ajoutees ?? 0, deja_presentes: d.deja_presentes ?? 0 };
          this.boutiques = d.boutiques ?? [];
          if (d.ajoutees > 0) {
            this.toastr.success(`${d.ajoutees} boutique(s) synchronisée(s)`);
            this.load();
          } else {
            this.toastr.info('Toutes les boutiques sont déjà synchronisées');
          }
        },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur de synchronisation'),
      });
  }

  // ── Essai ──────────────────────────────────────────────────────────────────
  openTrialModal(structureId: number): void {
    this.trialStructureId = structureId || null;
    this.showTrialModal = true;
  }

  startTrial(): void {
    if (!this.trialStructureId) return;
    this.isStartingTrial = true;
    this.abonnementSvc.startTrial(this.trialStructureId)
      .pipe(finalize(() => (this.isStartingTrial = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Essai démarré avec succès');
          this.showTrialModal = false;
          this.load();
        },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
      });
  }

  // ── Suspendre / Réactiver ──────────────────────────────────────────────────
  suspend(ab: any): void {
    Swal.fire({
      title: 'Suspendre l\'abonnement ?',
      html: `Structure <strong>#${ab.structureId}</strong> n'aura plus accès à l'application.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Suspendre',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.actionLoading = ab.id;
      this.abonnementSvc.suspend(ab.id)
        .pipe(finalize(() => (this.actionLoading = null)))
        .subscribe({
          next: () => { this.toastr.success('Abonnement suspendu'); this.load(); },
          error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
        });
    });
  }

  reactivate(ab: any): void {
    this.actionLoading = ab.id;
    this.abonnementSvc.reactivate(ab.id)
      .pipe(finalize(() => (this.actionLoading = null)))
      .subscribe({
        next: () => { this.toastr.success('Abonnement réactivé'); this.load(); },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
      });
  }

  valider(ab: any): void {
    Swal.fire({
      title: 'Valider ce renouvellement ?',
      html: `Structure <strong>${this.structureName(ab.structureId)}</strong> — plan <strong>${this.planLabel(ab.plan)}</strong>.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Valider',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#16a34a',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.actionLoading = ab.id;
      this.abonnementSvc.valider(ab.id)
        .pipe(finalize(() => (this.actionLoading = null)))
        .subscribe({
          next: () => { this.toastr.success('Abonnement validé'); this.load(); },
          error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
        });
    });
  }

  // ── Helpers ──────────────────────────���─────────────────────────────────────
  statutClass(statut: string): string {
    const map: Record<string, string> = {
      actif:      'bg-success-subtle text-success',
      expire:     'bg-danger-subtle text-danger',
      suspendu:   'bg-warning-subtle text-warning',
      en_attente: 'bg-info-subtle text-info',
    };
    return map[statut] ?? 'bg-secondary-subtle text-secondary';
  }

  joursClass(j: number, statut: string): string {
    if (statut !== 'actif') return 'text-muted';
    if (j <= 3) return 'text-danger fw-bold';
    if (j <= 7) return 'text-warning fw-semibold';
    return 'text-success';
  }

  structureName(id: number): string {
    return this.structures.find(s => s.id === id)?.nom ?? `#${id}`;
  }

  planLabel(p: string): string { return this.PLAN_LABELS[p] ?? p; }
}
