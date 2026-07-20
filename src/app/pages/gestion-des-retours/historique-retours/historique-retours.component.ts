import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { RetourVenteService } from '../../../services/gestion-des-retours/retour-vente.service';
import { AuthService } from '../../../services/auth/auth.service';
import { NzSelectModule } from 'ng-zorro-antd/select';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-historique-retours',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, NzSelectModule],
  templateUrl: './historique-retours.component.html',
  providers: [ToastrService],
})
export default class HistoriqueRetoursComponent implements OnInit, OnDestroy {
  retours: any[] = [];
  boutiques: any[] = [];
  currentUser: any;
  idBoutique = 0;
  isLoading = false;

  // Filtres
  filterReference = '';
  filterDateDebut = '';
  filterDateFin = '';
  filterMontant: number | null = null;

  // Modal détail
  selectedRetour: any = null;
  mobileDetailItem: any = null;

  get nouveauRetourRoute(): string {
    return this.router.url.startsWith('/pos') ? '/pos/retours/nouveau' : '/retours/nouveau';
  }

  constructor(
    private retourSvc: RetourVenteService,
    private authService: AuthService,
    private toastr: ToastrService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: any,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((u: any) => {
      this.currentUser = u;
      this.loadBoutiques();
      this.loadRetours();
    });
  }

  ngOnDestroy(): void {
    this.destroyDT();
  }

  // ── Permissions ────────────────────────────────────────────────────────────
  get peutFaireRetour(): boolean {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    if (code === 'admin' || code === 'responsable_structure') return true;
    return !!this.currentUser?.peut_faire_retour;
  }

  // ── Boutiques ──────────────────────────────────────────────────────────────
  loadBoutiques(): void {
    const embedded: any[] = this.currentUser?.boutiques ?? [];
    if (embedded.length > 0) {
      this.boutiques = embedded;
      this.idBoutique = this.currentUser?.boutique_id ?? embedded[0].id;
    } else if (this.currentUser?.boutique) {
      this.boutiques = [this.currentUser.boutique];
      this.idBoutique = this.currentUser.boutique_id ?? this.currentUser.boutique.id;
    }
  }

  onBoutiqueChange(): void { this.loadRetours(); }

  appliquerFiltres(): void { this.loadRetours(); }

  resetFiltres(): void {
    this.filterReference = '';
    this.filterDateDebut = '';
    this.filterDateFin = '';
    this.filterMontant = null;
    this.loadRetours();
  }

  // ── Liste ──────────────────────────────────────────────────────────────────
  loadRetours(): void {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    if ((code === 'admin' || code === 'gerant') && !this.idBoutique) {
      this.retours = [];
      return;
    }
    this.isLoading = true;
    const params: any = { boutique: this.idBoutique || undefined, page: 1, limit: 200 };
    if (this.filterReference?.trim()) params['reference'] = this.filterReference.trim();
    if (this.filterDateDebut) params['date_debut'] = this.filterDateDebut;
    if (this.filterDateFin) params['date_fin'] = this.filterDateFin;
    if (this.filterMontant != null && !isNaN(Number(this.filterMontant))) params['montant'] = this.filterMontant;

    this.retourSvc.getAll(params).subscribe({
      next: (r: any) => {
        this.retours = r?.data?.items ?? r?.data ?? [];
        this.isLoading = false;
        this.destroyDT();
        setTimeout(() => this.initDT(), 50);
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Erreur lors du chargement');
      },
    });
  }

  // ── Détail ─────────────────────────────────────────────────────────────────
  viewRetour(retour: any): void {
    this.selectedRetour = retour;
    const modal = document.getElementById('modal-detail-retour');
    if (modal) { new bootstrap.Modal(modal).show(); }
  }

  // ── Annuler ────────────────────────────────────────────────────────────────
  annuler(retour: any): void {
    Swal.fire({
      title: 'Annuler ce retour ?',
      html: `Référence <strong>${retour.reference}</strong> — le stock sera re-décrémenté.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, annuler',
      cancelButtonText: 'Non',
      confirmButtonColor: '#dc3545',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.retourSvc.annuler(retour.id).subscribe({
        next: () => { this.toastr.success('Retour annulé'); this.loadRetours(); },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
      });
    });
  }

  // ── DataTable ──────────────────────────────────────────────────────────────
  private initDT(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      $('.js-retours-dt').DataTable({
        data: this.retours,
        columns: [
          {
            data: null,
            render: (_: any, __: any, row: any) =>
              `<div class="fw-semibold">${row.reference ?? ''}</div>
               <div class="text-muted small">${row.vente?.reference ?? ''}</div>`,
          },
          {
            data: 'montant_total_rembourse',
            render: (d: any) => `<span class="fw-semibold text-success">${(d ?? 0).toLocaleString('fr-FR')} FCFA</span>`,
          },
          {
            data: 'statut',
            render: (d: any) => {
              const cls = d === 'valide' ? 'bg-success' : d === 'annule' ? 'bg-danger' : 'bg-secondary';
              return `<span class="badge ${cls}">${d ?? ''}</span>`;
            },
          },
          {
            data: null,
            render: (_: any, __: any, row: any) => {
              const caissier = row.user?.nom ?? row.user?.telephone ?? '—';
              const vendeur = row.vente?.user?.nom ?? row.vente?.user?.telephone ?? '—';
              return `<div class="small"><span class="text-muted">Retour:</span> ${caissier}</div>
                      <div class="small"><span class="text-muted">Vente:</span> ${vendeur}</div>`;
            },
          },
          { data: 'motif', render: (d: any) => d ? `<span title="${d}">${d.length > 30 ? d.slice(0, 30) + '…' : d}</span>` : '<span class="text-muted">—</span>' },
          {
            data: 'created_at',
            render: (d: any) => {
              if (!d) return '';
              const dt = new Date(d);
              return `${dt.toLocaleDateString('fr-FR')} ${dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
            },
          },
          {
            data: null, orderable: false, className: 'text-center',
            render: (_: any, __: any, row: any) => `
              <div class="btn-group">
                <button class="btn btn-sm btn-info me-1" data-action="view" data-id="${row.id}" title="Détail">
                  <i class="bi bi-eye"></i>
                </button>
                ${row.statut === 'valide' ? `
                <button class="btn btn-sm btn-danger" data-action="annuler" data-id="${row.id}" title="Annuler">
                  <i class="bi bi-x-circle"></i>
                </button>` : ''}
              </div>`,
          },
        ],
        language: {
          emptyTable: 'Aucun retour trouvé',
          search: 'Rechercher :',
          info: 'Affichage de _START_ à _END_ sur _TOTAL_ résultat(s)',
          infoEmpty: 'Aucun résultat',
          zeroRecords: 'Aucun résultat',
          lengthMenu: 'Afficher _MENU_ éléments',
          paginate: { first: '«', last: '»', next: '›', previous: '‹' },
        },
        pageLength: 20,
        responsive: true,
        ordering: true,
        createdRow: (row: any, _data: any) => {
          $(row).find('[data-action]').on('click', (e: any) => {
            const btn = $(e.currentTarget);
            const action = btn.data('action');
            const id = btn.data('id');
            const retour = this.retours.find((r: any) => r.id === id);
            if (!retour) return;
            if (action === 'view') this.viewRetour(retour);
            if (action === 'annuler') this.annuler(retour);
          });
        },
      });
    } catch (e) {
      console.error('DataTable init error', e);
    }
  }

  private destroyDT(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      if ($.fn.DataTable.isDataTable('.js-retours-dt')) {
        $('.js-retours-dt').DataTable().destroy();
      }
    } catch (_) {}
  }
}
