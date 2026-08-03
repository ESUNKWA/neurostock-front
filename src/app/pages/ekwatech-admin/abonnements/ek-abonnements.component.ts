import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, Subject, debounceTime } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { AbonnementService } from '../../../services/abonnement/abonnement.service';
import { StructureService } from '../../../services/structure/structure.service';
import { FactureModalComponent } from '../../../components/facture-modal/facture-modal.component';
import { NzSelectModule } from 'ng-zorro-antd/select';

declare var $: any;

@Component({
  selector: 'app-ek-abonnements',
  standalone: true,
  imports: [CommonModule, FormsModule, FactureModalComponent, NzSelectModule],
  templateUrl: './ek-abonnements.component.html',
  providers: [ToastrService],
})
export default class EkAbonnementsComponent implements OnInit, OnDestroy {
  abonnements: any[] = [];
  structures: any[] = [];
  plans: any[] = [];
  loading = false;
  actionLoading: number | null = null;

  // Modal souscrire
  showModal = false;
  isSubmitting = false;
  isRenewal = false;
  form = {
    structureId: null as number | null,
    plan: '1_mois',
    montant: 0,
    notes: '',
    remise_type: '' as '' | 'montant' | 'pourcentage',
    remise_valeur: 0,
  };

  get montantRemise(): number {
    if (!this.devis || !this.form.remise_type || !this.form.remise_valeur) return 0;
    if (this.form.remise_type === 'pourcentage') {
      return Math.round(this.devis.total * this.form.remise_valeur / 100);
    }
    return this.form.remise_valeur;
  }

  get totalApresRemise(): number {
    if (!this.devis) return this.form.montant;
    return Math.max(0, this.devis.total - this.montantRemise);
  }

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

  // Contrat
  contratLoadingId: number | null = null;

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
    @Inject(PLATFORM_ID) private platformId: any,
  ) {}

  ngOnInit(): void {
    // Structures d'abord → puis abonnements (pour avoir les noms dans le DataTable)
    this.loadStructures();
    this.loadPlans();

    this.devisTrigger$.pipe(debounceTime(300)).subscribe(() => {
      this.fetchDevis();
    });
  }

  ngOnDestroy(): void { this.destroyDataTable(); }

  load(): void {
    this.loading = true;
    this.abonnementSvc.getAll()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r: any) => {
          this.abonnements = r?.data ?? [];
          this.destroyDataTable();
          setTimeout(() => this.initDataTable(), 50);
        },
      });
  }

  loadStructures(): void {
    this.structureSvc.find().subscribe({
      next: (r: any) => {
        this.structures = r?.data ?? (Array.isArray(r) ? r : []);
        this.load();
      },
    });
  }

  private destroyDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const t = $('#ek-abonnements-dt');
      if ($.fn.DataTable.isDataTable(t)) t.DataTable().destroy();
    } catch {}
  }

  private initDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      $('#ek-abonnements-dt').DataTable({
        data: this.abonnements,
        columns: [
          {
            data: null,
            render: (_: any, __: any, row: any) => `
              <div class="fw-semibold small">${this.structureName(row.structureId)}</div>
              <span class="text-muted" style="font-size:.72rem">#${row.structureId}</span>`,
          },
          {
            data: 'plan',
            render: (d: any) =>
              `<span class="badge bg-primary-subtle text-primary fw-semibold">${this.planLabel(d)}</span>`,
          },
          {
            data: 'date_debut',
            render: (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '—',
          },
          {
            data: 'date_fin',
            render: (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '—',
          },
          {
            data: null,
            render: (_: any, __: any, row: any) => {
              const j = row.jours_restants;
              const cls = this.joursClass(j, row.statut);
              return j != null ? `<span class="${cls}">${j}j</span>` : '<span class="text-muted">—</span>';
            },
          },
          {
            data: 'boutiques_supplementaires',
            className: 'text-center',
            render: (d: any, __: any, row: any) =>
              d > 0
                ? `<button class="btn btn-sm btn-outline-secondary py-0 px-2" data-action="boutiques" data-id="${row.id}">
                     <i class="bi bi-shop-window me-1"></i>${d}
                   </button>`
                : '<span class="text-muted small">—</span>',
          },
          {
            data: 'statut',
            render: (d: any) => {
              const cls = this.statutClass(d);
              const icons: Record<string, string> = {
                actif: 'bi-check-circle-fill', expire: 'bi-x-circle-fill',
                en_attente: 'bi-hourglass-split', suspendu: 'bi-pause-circle-fill',
              };
              const lbl = d === 'en_attente' ? 'En attente' : (d ? d.charAt(0).toUpperCase() + d.slice(1) : '');
              return `<span class="badge ${cls}"><i class="bi ${icons[d] ?? 'bi-circle'} me-1"></i>${lbl}</span>`;
            },
          },
          {
            data: null,
            orderable: false,
            className: 'text-end',
            render: (_: any, __: any, row: any) => {
              const btns = [
                `<button class="btn btn-sm btn-outline-secondary" data-action="facture" data-id="${row.id}" title="Facture">
                   <i class="bi bi-receipt"></i>
                 </button>`,
                `<button class="btn btn-sm btn-outline-primary" data-action="contrat" data-id="${row.id}" title="Contrat PDF">
                   <i class="bi bi-file-earmark-text"></i>
                 </button>`,
              ];
              if (row.statut === 'en_attente') {
                btns.push(`<button class="btn btn-sm btn-success" data-action="valider" data-id="${row.id}">
                  <i class="bi bi-check2-circle me-1"></i>Valider
                </button>`);
              } else {
                btns.push(`<button class="btn btn-sm btn-outline-primary" data-action="renouveler" data-id="${row.id}">
                  <i class="bi bi-arrow-repeat me-1"></i>Renouveler
                </button>`);
                if (row.statut === 'actif') {
                  btns.push(`<button class="btn btn-sm btn-outline-warning" data-action="suspendre" data-id="${row.id}" title="Suspendre">
                    <i class="bi bi-pause-fill"></i>
                  </button>`);
                } else if (row.statut === 'suspendu') {
                  btns.push(`<button class="btn btn-sm btn-outline-success" data-action="reactiver" data-id="${row.id}" title="Réactiver">
                    <i class="bi bi-play-fill"></i>
                  </button>`);
                }
              }
              return `<div class="d-flex justify-content-end gap-1">${btns.join('')}</div>`;
            },
          },
        ],
        language: {
          emptyTable: 'Aucun abonnement enregistré',
          search: 'Rechercher :',
          info: '_START_ à _END_ sur _TOTAL_ abonnement(s)',
          infoEmpty: 'Aucun résultat',
          zeroRecords: 'Aucun résultat',
          lengthMenu: 'Afficher _MENU_ éléments',
          paginate: { first: '«', last: '»', next: '›', previous: '‹' },
        },
        pageLength: 10,
        order: [[0, 'asc']],
        createdRow: (row: any) => {
          $(row).find('[data-action]').on('click', (e: any) => {
            const btn = $(e.currentTarget);
            const action = btn.data('action');
            const id = btn.data('id');
            const ab = this.abonnements.find(a => a.id === id);
            if (!ab && action !== 'facture' && action !== 'contrat') return;
            switch (action) {
              case 'facture':    this.factureAbonnementId = id; break;
              case 'contrat':    this.downloadContrat(id); break;
              case 'valider':    this.valider(ab); break;
              case 'renouveler': this.openSubscribeModal(ab); break;
              case 'suspendre':  this.suspend(ab); break;
              case 'reactiver':  this.reactivate(ab); break;
              case 'boutiques':  this.openBoutiquesModal(ab); break;
            }
          });
        },
      });
    } catch (e) {
      console.error('DataTable abonnements:', e);
    }
  }

  loadPlans(): void {
    this.abonnementSvc.getPlans().subscribe({
      next: (r: any) => { this.plans = r?.data ?? []; },
    });
  }

  // ── Devis ─────────────────────────────────────────────────────────────────────
  onFormChange(): void {
    this.devis = null;
    this.form.remise_type = '';
    this.form.remise_valeur = 0;
    if (this.form.structureId && this.form.plan) {
      this.devisTrigger$.next();
    }
  }

  onRemiseChange(): void {
    this.form.montant = this.totalApresRemise;
  }

  fetchDevis(): void {
    if (!this.form.structureId || !this.form.plan) return;
    this.devisLoading = true;
    this.abonnementSvc.getDevis(this.form.structureId, this.form.plan)
      .pipe(finalize(() => (this.devisLoading = false)))
      .subscribe({
        next: (r: any) => {
          // L'API retourne l'objet directement ou enveloppé dans { data: ... }
          this.devis = r?.data ?? r ?? null;
          if (this.devis) { this.form.montant = this.devis.total; }
        },
        error: (e: any) => {
          this.devis = null;
          this.toastr.error(e?.error?.message || 'Impossible de calculer le devis');
        },
      });
  }

  // ── Modal souscrire ────────────────────────────────────────────────────────
  openSubscribeModal(ab?: any): void {
    this.devis = null;
    this.isRenewal = !!ab;
    this.form = {
      structureId: ab?.structureId ?? null,
      plan: '1_mois',
      montant: 0,
      notes: '',
      remise_type: '',
      remise_valeur: 0,
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
      remise_type: this.form.remise_type || undefined,
      remise_valeur: this.form.remise_valeur > 0 ? this.form.remise_valeur : undefined,
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
      title: `${label} ce point de vente ?`,
      html: b.est_active
        ? `<strong>${b.boutiqueNom}</strong> ne sera plus facturé au prochain renouvellement.`
        : `<strong>${b.boutiqueNom}</strong> sera à nouveau facturé au prochain renouvellement.`,
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
          this.toastr.success(`Point de vente ${action === 'désactiver' ? 'désactivé' : 'activé'}`);
          this.load();
        },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
      });
    });
  }

  retirerBoutique(b: any): void {
    if (!this.boutiquesModalStructureId) return;
    Swal.fire({
      title: 'Retirer ce point de vente ?',
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
            this.toastr.success('Point de vente retiré de la facturation');
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
            this.toastr.success(`${d.ajoutees} point(s) de vente synchronisé(s)`);
            this.load();
          } else {
            this.toastr.info('Tous les points de vente sont déjà synchronisés');
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
      html: `
        <p style="margin:0 0 14px">
          Structure <strong>${this.structureName(ab.structureId)}</strong> — plan <strong>${this.planLabel(ab.plan)}</strong>.<br>
          <span style="color:#6b7280;font-size:.88rem">Montant : ${Number(ab.montant ?? 0).toLocaleString('fr-FR')} ${ab.devise ?? 'XOF'}</span>
        </p>
        <div style="text-align:left;border:1px solid #e5e7eb;border-radius:8px;padding:12px;background:#f9fafb;">
          <label style="font-weight:600;font-size:.82rem;display:block;margin-bottom:8px;color:#374151;">
            🏷 Appliquer une réduction (optionnel)
          </label>
          <div style="display:flex;gap:8px;">
            <select id="swal-remise-type" style="flex:1;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.88rem;">
              <option value="">Aucune</option>
              <option value="pourcentage">Pourcentage (%)</option>
              <option value="montant">Montant fixe</option>
            </select>
            <input id="swal-remise-valeur" type="number" min="0" placeholder="Valeur"
              style="flex:1;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.88rem;">
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Valider',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#16a34a',
      preConfirm: () => {
        const type = (document.getElementById('swal-remise-type') as HTMLSelectElement)?.value;
        const valeur = parseFloat((document.getElementById('swal-remise-valeur') as HTMLInputElement)?.value ?? '0');
        return { remise_type: type || undefined, remise_valeur: valeur > 0 ? valeur : undefined };
      },
    }).then(r => {
      if (!r.isConfirmed) return;
      this.actionLoading = ab.id;
      const remise = r.value?.remise_type ? r.value : undefined;
      this.abonnementSvc.valider(ab.id, remise)
        .pipe(finalize(() => (this.actionLoading = null)))
        .subscribe({
          next: () => { this.toastr.success('Abonnement validé'); this.load(); },
          error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
        });
    });
  }

  // ── Contrat PDF ───────────────────────────────────────────────────────────
  downloadContrat(abonnementId: number): void {
    this.contratLoadingId = abonnementId;
    this.abonnementSvc.getContratPdf(abonnementId)
      .pipe(finalize(() => (this.contratLoadingId = null)))
      .subscribe({
        next: (blob: any) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `contrat-${abonnementId}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la génération du contrat'),
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
