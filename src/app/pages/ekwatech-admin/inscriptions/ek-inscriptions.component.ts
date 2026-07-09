import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { InscriptionService, ValiderInscriptionDto } from '../../../services/inscription/inscription.service';

declare var $: any;

@Component({
  selector: 'app-ek-inscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ek-inscriptions.component.html',
  providers: [ToastrService],
})
export default class EkInscriptionsComponent implements OnInit, OnDestroy {
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
    @Inject(PLATFORM_ID) private platformId: any,
  ) {}

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void { this.destroyDataTable(); }

  load(): void {
    this.loading = true;
    this.inscriptionSvc.getAll()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r: any) => {
          this.inscriptions = r?.data ?? (Array.isArray(r) ? r : []);
          this.destroyDataTable();
          setTimeout(() => this.initDataTable(), 50);
        },
        error: () => { this.inscriptions = []; },
      });
  }

  private destroyDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const t = $('#ek-inscriptions-dt');
      if ($.fn.DataTable.isDataTable(t)) t.DataTable().destroy();
    } catch {}
  }

  private initDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      $('#ek-inscriptions-dt').DataTable({
        data: this.inscriptions,
        columns: [
          {
            data: 'id',
            render: (d: any) => `<span class="text-muted small">${d}</span>`,
          },
          {
            data: null,
            render: (_: any, __: any, row: any) =>
              `<div class="fw-semibold">${row.structure_nom || ''}</div>
               ${row.structure_situation_geo ? `<small class="text-muted">${row.structure_situation_geo}</small>` : ''}`,
          },
          {
            data: null,
            render: (_: any, __: any, row: any) =>
              `<div>${row.boutique_nom || ''}</div>
               ${row.boutique_situation_geo ? `<small class="text-muted">${row.boutique_situation_geo}</small>` : ''}`,
          },
          {
            data: null,
            render: (_: any, __: any, row: any) =>
              `${row.responsable_prenoms || ''} ${row.responsable_nom || ''}`,
          },
          {
            data: null,
            render: (_: any, __: any, row: any) =>
              `${row.responsable_telephone ? `<div class="small"><i class="bi bi-telephone me-1 text-muted"></i>${row.responsable_telephone}</div>` : ''}
               ${row.responsable_email ? `<div class="small text-muted">${row.responsable_email}</div>` : ''}`,
          },
          {
            data: 'statut',
            render: (d: any) =>
              `<span class="badge rounded-pill px-2 py-1 ${this.statutClass(d)}">${this.statutLabel(d)}</span>`,
          },
          {
            data: 'created_at',
            render: (d: any) => {
              if (!d) return '';
              const dt = new Date(d);
              const dd = dt.getDate().toString().padStart(2, '0');
              const mm = (dt.getMonth() + 1).toString().padStart(2, '0');
              const hh = dt.getHours().toString().padStart(2, '0');
              const min = dt.getMinutes().toString().padStart(2, '0');
              return `${dd}/${mm}/${dt.getFullYear()} ${hh}:${min}`;
            },
          },
          {
            data: null,
            orderable: false,
            className: 'text-end',
            render: (_: any, __: any, row: any) => {
              if (row.statut === 'en_attente') {
                return `
                  <button class="btn btn-sm btn-success me-1" data-action="valider" data-id="${row.id}">
                    <i class="bi bi-check-lg"></i> Valider
                  </button>
                  <button class="btn btn-sm btn-outline-danger" data-action="rejeter" data-id="${row.id}">
                    <i class="bi bi-x-lg"></i> Rejeter
                  </button>`;
              }
              return '<span class="text-muted small fst-italic">—</span>';
            },
          },
        ],
        language: {
          emptyTable: 'Aucune demande d\'inscription',
          search: 'Rechercher :',
          info: '_START_ à _END_ sur _TOTAL_ inscription(s)',
          infoEmpty: 'Aucun résultat',
          zeroRecords: 'Aucun résultat',
          lengthMenu: 'Afficher _MENU_ éléments',
          paginate: { first: '«', last: '»', next: '›', previous: '‹' },
        },
        pageLength: 20,
        order: [[6, 'desc']],
        createdRow: (row: any) => {
          $(row).find('[data-action]').on('click', (e: any) => {
            const btn = $(e.currentTarget);
            const action = btn.data('action');
            const ins = this.inscriptions.find(i => i.id === btn.data('id'));
            if (!ins) return;
            if (action === 'valider') this.openValider(ins);
            if (action === 'rejeter') this.rejeter(ins);
          });
        },
      });
    } catch (e) {
      console.error('DataTable inscriptions:', e);
    }
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
          next: () => { this.toastr.success('Demande rejetée'); this.load(); },
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
