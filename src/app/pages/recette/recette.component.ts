import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { DashService } from '../../services/dash/dash.service';
import { BoutiqueService } from '../../services/boutique/boutique.service';
import { AuthService } from '../../services/auth/auth.service';

declare var $: any;

type FilterType = 'today' | 'month' | 'all' | 'custom';

@Component({
  selector: 'app-recette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recette.component.html',
})
export default class RecetteComponent implements OnInit, OnDestroy {
  private dashService     = inject(DashService);
  private boutiqueService = inject(BoutiqueService);
  private authService     = inject(AuthService);
  private platformId      = inject(PLATFORM_ID);

  currentUser: any = null;
  boutiques: any[]  = [];
  boutiqueId: number | null = null;

  // Filtres
  activeFilter: FilterType = 'today';
  dateDebut = '';
  dateFin   = '';

  // Données
  recette: any   = null;
  ventes: any[]  = [];
  loading        = false;
  mobileDetailItem: any = null;

  readonly modesLabels: Record<string, string> = {
    espece:       'Espèces',
    carte:        'Carte bancaire',
    credit:       'Crédit',
    orange_money: 'Orange Money',
    wave:         'Wave',
    mtn_money:    'MTN Money',
    moov_money:   'Moov Money',
    dajmo:        'Dajmo',
  };

  get isAdmin(): boolean {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    return code === 'admin' || code === 'responsable_structure';
  }

  get modeEntries(): { mode: string; label: string; montant: number }[] {
    const obj = this.recette?.par_mode_paiement;
    if (!obj) return [];
    return Object.entries(obj)
      .filter(([, v]) => Number(v) > 0)
      .map(([mode, montant]) => ({ mode, label: this.modesLabels[mode] ?? mode, montant: Number(montant) }));
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    this.loadBoutiques();
  }

  ngOnDestroy(): void {
    this.destroyDataTable();
  }

  loadBoutiques(): void {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    if (code === 'admin') {
      this.boutiqueService.find().subscribe({
        next: (r: any) => {
          this.boutiques = r?.data ?? [];
          if (this.boutiques.length === 1) {
            this.boutiqueId = this.boutiques[0].id;
            this.setFilter('today');
          }
        },
      });
    } else {
      this.boutiques  = this.currentUser?.boutiques ?? [];
      this.boutiqueId = this.boutiques[0]?.id ?? this.currentUser?.boutique_id ?? null;
      if (this.boutiqueId) this.setFilter('today');
    }
  }

  setFilter(type: FilterType): void {
    this.activeFilter = type;
    if (type !== 'custom') {
      const today = new Date();
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (type === 'today') {
        this.dateDebut = fmt(today);
        this.dateFin   = fmt(today);
      } else if (type === 'month') {
        this.dateDebut = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
        this.dateFin   = fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0));
      } else {
        this.dateDebut = '';
        this.dateFin   = '';
      }
      this.load();
    }
  }

  applyCustom(): void { this.load(); }
  onBoutiqueChange(): void { this.load(); }

  load(): void {
    if (!this.boutiqueId) return;
    this.loading = true;
    this.dashService.getRecette({
      boutique:   this.boutiqueId,
      date_debut: this.dateDebut || undefined,
      date_fin:   this.dateFin   || undefined,
      limit:      5000,
    }).pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r: any) => {
          const data   = r?.data ?? r;
          this.recette = data;
          this.ventes  = data?.ventes ?? [];
          this.destroyDataTable();
          setTimeout(() => {
            if (isPlatformBrowser(this.platformId)) this.initDataTable();
          }, 50);
        },
        error: () => { this.recette = null; this.ventes = []; },
      });
  }

  private destroyDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const t = $('.js-dataTable-recette');
      if ($.fn.DataTable?.isDataTable(t)) t.DataTable().destroy();
    } catch (_) {}
  }

  private initDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      $('.js-dataTable-recette').DataTable({
        data: this.ventes,
        columns: [
          {
            data:      null,
            orderable: false,
            className: 'text-center dt-expand-col',
            width:     '36px',
            render:    () => `<i class="bi bi-chevron-right text-muted" style="cursor:pointer"></i>`,
          },
          {
            data:   'reference',
            render: (d: any) => `<span class="fw-semibold small text-primary">${d || ''}</span>`,
          },
          {
            data:   'date_vente',
            render: (d: any) => {
              if (!d) return '—';
              const dt = new Date(d);
              return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()} `
                   + `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
            },
          },
          { data: 'caissier', render: (d: any) => d || '—' },
          {
            data:   null,
            render: (_: any, __: any, row: any) => {
              if (!row.client) return '<span class="text-muted">—</span>';
              return row.client_telephone
                ? `${row.client}<br><small class="text-muted">${row.client_telephone}</small>`
                : row.client;
            },
          },
          {
            data:   'mode_paiement',
            render: (d: any) => `<span class="badge ${this.modeClass(d)}">${this.modeLabel(d)}</span>`,
          },
          {
            data:      'remise',
            className: 'text-end text-warning',
            render:    (d: any) => d > 0 ? Number(d).toLocaleString('fr-FR') : '—',
          },
          {
            data:      'montant',
            className: 'text-end',
            render:    (d: any) => `<strong class="text-success">${Number(d).toLocaleString('fr-FR')}</strong>`,
          },
        ],
        language: {
          emptyTable:  'Aucune vente pour cette période',
          search:      'Rechercher :',
          info:        'Affichage de _START_ à _END_ sur _TOTAL_ vente(s)',
          infoEmpty:   'Aucune vente',
          zeroRecords: 'Aucun résultat',
          lengthMenu:  'Afficher _MENU_ éléments',
          paginate: { first: '«', last: '»', next: '›', previous: '‹' },
        },
        dom: '<"row mb-2"<"col-sm-12 col-md-6"B><"col-sm-12 col-md-6"f>><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        buttons: [
          {
            extend:    'excel',
            text:      '<i class="bi bi-file-earmark-excel"></i> Excel',
            className: 'btn btn-success btn-sm me-1',
            exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] },
          },
          {
            extend:    'pdf',
            text:      '<i class="bi bi-file-earmark-pdf"></i> PDF',
            className: 'btn btn-danger btn-sm',
            exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] },
          },
        ],
        pageLength:   20,
        searching:    true,
        responsive:   true,
        ordering:     true,
        pagingType:   'full_numbers',
        autoWidth:    false,
        createdRow: (row: any, data: any) => {
          $(row).find('.dt-expand-col i').on('click', (e: Event) => {
            e.stopPropagation();
            const dtApi = $('.js-dataTable-recette').DataTable();
            const dtRow = dtApi.row(row);
            if (dtRow.child.isShown()) {
              dtRow.child.hide();
              $(row).find('.dt-expand-col i')
                .removeClass('bi-chevron-down').addClass('bi-chevron-right');
            } else {
              dtRow.child(this.buildChildHtml(data)).show();
              $(row).find('.dt-expand-col i')
                .removeClass('bi-chevron-right').addClass('bi-chevron-down');
            }
          });
        },
      });
    } catch (err) {
      console.error('DataTable init error:', err);
    }
  }

  private buildChildHtml(vente: any): string {
    if (!vente.lignes?.length) {
      return '<div class="px-4 py-2 text-muted small fst-italic">Aucun détail disponible</div>';
    }
    const rows = vente.lignes.map((l: any) => `
      <tr>
        <td>${l.nom ?? '—'}</td>
        <td class="text-end">${l.quantite}</td>
        <td class="text-end">${Number(l.prix_unitaire).toLocaleString('fr-FR')}</td>
        <td class="text-end fw-semibold">${Number(l.sous_total).toLocaleString('fr-FR')}</td>
      </tr>`).join('');
    return `
      <div class="bg-light border-top border-bottom px-4 py-2">
        <table class="table table-sm mb-0" style="font-size:.8rem">
          <thead>
            <tr class="text-muted">
              <th class="border-0 ps-0">Produit</th>
              <th class="border-0 text-end">Qté</th>
              <th class="border-0 text-end">PU (XOF)</th>
              <th class="border-0 text-end pe-0">Sous-total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  modeLabel(mode: string): string {
    return this.modesLabels[mode] ?? mode;
  }

  modeClass(mode: string): string {
    const map: Record<string, string> = {
      espece:       'bg-success-subtle text-success',
      carte:        'bg-info-subtle text-info',
      credit:       'bg-warning-subtle text-warning',
      orange_money: 'bg-warning-subtle text-warning',
      wave:         'bg-primary-subtle text-primary',
      mtn_money:    'bg-warning-subtle text-warning',
      moov_money:   'bg-info-subtle text-info',
      dajmo:        'bg-secondary-subtle text-secondary',
    };
    return map[mode] ?? 'bg-secondary-subtle text-secondary';
  }
}
