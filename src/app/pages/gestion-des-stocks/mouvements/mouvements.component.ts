import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { StockMouvementService } from '../../../services/gestion-des-stocks/stock-mouvement.service';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { NzSelectModule } from 'ng-zorro-antd/select';

declare var $: any;

@Component({
  selector: 'app-mouvements',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NzSelectModule],
  templateUrl: './mouvements.component.html',
  styleUrl: './mouvements.component.scss'
})
export default class MouvementsComponent implements OnInit, OnDestroy {
  mouvements: any[] = [];
  boutiques:  any[] = [];
  currentUser: any;
  selectedBoutiqueId: number | null = null;
  isLoading = false;

  constructor(
    private stockService: StockMouvementService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      this.loadBoutiques();
      const code = user?.profil?.code?.toLowerCase();
      if (code !== 'admin' && code !== 'responsable_structure') {
        this.selectedBoutiqueId = user?.boutique?.id ?? null;
        this.loadMouvements();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyDataTable();
  }

  loadBoutiques(): void {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    if (code === 'admin') {
      this.boutiqueService.find().subscribe({
        next: (r: any) => { this.boutiques = r?.data ?? []; }
      });
    } else if (code === 'responsable_structure') {
      this.boutiqueService.findByStructure(this.currentUser.structure_id).subscribe({
        next: (r: any) => { this.boutiques = r?.data ?? []; }
      });
    } else {
      this.boutiques = this.currentUser?.boutique ? [this.currentUser.boutique] : [];
    }
  }

  onBoutiqueChange(): void {
    this.loadMouvements();
  }

  loadMouvements(): void {
    if (!this.selectedBoutiqueId) { this.mouvements = []; return; }
    this.isLoading = true;
    this.destroyDataTable();
    this.stockService
      .getMouvements({ boutique: this.selectedBoutiqueId, page: 1, limit: 500 })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (r: any) => {
          this.mouvements = r?.data ?? [];
          setTimeout(() => {
            if (isPlatformBrowser(this.platformId)) this.initDataTable();
          }, 50);
        },
        error: () => { this.mouvements = []; }
      });
  }

  private destroyDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const t = $('.js-dataTable-mouvements');
      if ($.fn.DataTable.isDataTable(t)) t.DataTable().destroy();
    } catch {}
  }

  private initDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      $('.js-dataTable-mouvements').DataTable({
        data: this.mouvements,
        columns: [
          {
            data: null,
            render: (_d: any, _t: any, row: any) => {
              if (!row.created_at) return '—';
              const d = new Date(row.created_at);
              const date = d.toLocaleDateString('fr-FR');
              const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
              return `<span class="text-nowrap small text-muted">${date} ${time}</span>`;
            }
          },
          {
            data: null,
            render: (_d: any, _t: any, row: any) => {
              const nom = row.produit?.nom || '—';
              const um  = row.produit?.unite_mesure
                ? ` <span class="text-muted small">(${row.produit.unite_mesure})</span>` : '';
              return `<span class="fw-semibold">${nom}</span>${um}`;
            }
          },
          {
            data: null,
            render: (_d: any, _t: any, row: any) =>
              row.mouvement === 'entree'
                ? '<span class="badge bg-success"><i class="bi bi-arrow-down-circle me-1"></i>Entrée</span>'
                : '<span class="badge bg-danger"><i class="bi bi-arrow-up-circle me-1"></i>Sortie</span>'
          },
          {
            data: null,
            render: (_d: any, _t: any, row: any) => {
              if (row.source === 'vente')
                return '<span class="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle"><i class="bi bi-cart3 me-1"></i>Vente</span>';
              if (row.source === 'achat')
                return '<span class="badge bg-warning bg-opacity-10 text-warning border border-warning-subtle"><i class="bi bi-truck me-1"></i>Achat</span>';
              return `<span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary-subtle"><i class="bi bi-arrow-left-right me-1"></i>${row.source || 'Manuel'}</span>`;
            }
          },
          {
            data: null, className: 'text-center',
            render: (_d: any, _t: any, row: any) => {
              const sign = row.mouvement === 'entree' ? '+' : '−';
              const cls  = row.mouvement === 'entree' ? 'text-success' : 'text-danger';
              return `<span class="fw-bold ${cls}">${sign}${row.quantite}</span>`;
            }
          },
          {
            data: null, className: 'text-center',
            render: (_d: any, _t: any, row: any) =>
              row.stock_avant != null ? `<span class="text-muted">${row.stock_avant}</span>` : '—'
          },
          {
            data: null, className: 'text-center',
            render: (_d: any, _t: any, row: any) =>
              row.stock_apres != null ? `<span class="fw-semibold">${row.stock_apres}</span>` : '—'
          },
          {
            data: null,
            render: (_d: any, _t: any, row: any) => {
              const ref = row.vente?.reference || row.achat?.reference || '—';
              return `<span class="badge bg-light text-dark border font-monospace small">${ref}</span>`;
            }
          },
          {
            data: null,
            render: (_d: any, _t: any, row: any) => {
              const u = row.utilisateur;
              if (!u) return '<span class="text-muted">—</span>';
              return `<span class="small text-muted">${`${u.prenoms || ''} ${u.nom || ''}`.trim()}</span>`;
            }
          },
        ],
        language: {
          emptyTable:  'Aucun mouvement de stock',
          search:      'Rechercher :',
          info:        'Affichage de _START_ à _END_ sur _TOTAL_ mouvement(s)',
          infoEmpty:   'Aucun résultat',
          zeroRecords: 'Aucun résultat',
          lengthMenu:  'Afficher _MENU_ éléments',
          paginate: { first: '«', last: '»', next: '›', previous: '‹' },
        },
        dom: '<"row mb-2"<"col-sm-12 col-md-6"B><"col-sm-12 col-md-6"f>><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        buttons: [
          { extend: 'excel', text: '<i class="bi bi-file-earmark-excel"></i> Excel', className: 'btn btn-success btn-sm me-1' },
          { extend: 'pdf',   text: '<i class="bi bi-file-earmark-pdf"></i> PDF',    className: 'btn btn-danger btn-sm'   },
        ],
        order:      [[0, 'desc']],
        pageLength: 25,
        responsive: true,
        ordering:   true,
        autoWidth:  false,
      });
    } catch {}
  }
}
