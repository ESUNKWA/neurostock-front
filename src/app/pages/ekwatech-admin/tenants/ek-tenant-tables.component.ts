import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TenantService } from '../../../services/tenant/tenant.service';

declare var $: any;

@Component({
  selector: 'app-ek-tenant-tables',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ek-tenant-tables.component.html',
})
export default class EkTenantTablesComponent implements OnInit, OnDestroy {
  structureId!: number;
  tenant: any = null;

  tables: string[] = [];
  loadingTables = false;

  selectedTable: string | null = null;
  loadingContent = false;
  contentError: string | null = null;
  totalRows = 0;

  constructor(
    private route: ActivatedRoute,
    private tenantSvc: TenantService,
    @Inject(PLATFORM_ID) private platformId: any,
  ) {}

  ngOnInit(): void {
    this.structureId = Number(this.route.snapshot.paramMap.get('structureId'));
    this.loadTenant();
    this.loadTables();
  }

  ngOnDestroy(): void {
    this.destroyDT();
  }

  loadTenant(): void {
    this.tenantSvc.getAll().subscribe({
      next: (r: any) => {
        const list: any[] = r?.data ?? (Array.isArray(r) ? r : []);
        this.tenant = list.find(t => t.structureId === this.structureId) ?? null;
      },
    });
  }

  loadTables(): void {
    this.loadingTables = true;
    this.tenantSvc.getTables(this.structureId)
      .pipe(finalize(() => (this.loadingTables = false)))
      .subscribe({
        next: (r: any) => { this.tables = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []); },
        error: () => { this.tables = []; },
      });
  }

  selectTable(table: string): void {
    this.selectedTable = table;
    this.contentError = null;
    this.totalRows = 0;
    this.destroyDT();
    this.loadContent();
  }

  loadContent(): void {
    if (!this.selectedTable) return;
    this.loadingContent = true;
    this.contentError = null;

    // Fetch all rows (large limit) so DataTables handles pagination/search client-side
    this.tenantSvc.getTableContent(this.structureId, this.selectedTable, 1, 1000)
      .pipe(finalize(() => (this.loadingContent = false)))
      .subscribe({
        next: (r: any) => {
          const d = r?.data ?? r;
          const rows: any[] = d?.rows ?? [];
          this.totalRows = d?.total ?? rows.length;
          this.destroyDT();
          setTimeout(() => this.initDT(rows), 50);
        },
        error: (e: any) => {
          this.contentError = e?.error?.message || 'Erreur lors du chargement de la table';
        },
      });
  }

  private initDT(rows: any[]): void {
    if (!isPlatformBrowser(this.platformId) || rows.length === 0) return;
    const columns = Object.keys(rows[0]).map(key => ({
      data: key,
      title: key,
      defaultContent: '—',
      render: (data: any) => {
        if (data === null || data === undefined) return '<span class="text-muted">—</span>';
        if (typeof data === 'boolean') return data
          ? '<span class="badge bg-success-subtle text-success">Oui</span>'
          : '<span class="badge bg-secondary-subtle text-secondary">Non</span>';
        if (typeof data === 'object') return `<code style="font-size:.72rem">${JSON.stringify(data)}</code>`;
        const str = String(data);
        return str.length > 80 ? `<span title="${str}">${str.substring(0, 80)}…</span>` : str;
      },
    }));

    try {
      $('#ek-inspect-dt').DataTable({
        data: rows,
        columns,
        destroy: true,
        pageLength: 10,
        lengthMenu: [10, 20, 50, 100],
        scrollX: true,
        language: {
          search: 'Rechercher :',
          lengthMenu: 'Afficher _MENU_ lignes',
          info: '_START_ à _END_ sur _TOTAL_ ligne(s)',
          infoEmpty: 'Aucune ligne',
          zeroRecords: 'Aucun résultat',
          paginate: { first: '«', last: '»', next: '›', previous: '‹' },
        },
        dom: '<"row mb-2"<"col-sm-6"l><"col-sm-6"f>><"row"<"col-sm-12"tr>><"row mt-2"<"col-sm-5"i><"col-sm-7"p>>',
      });
    } catch (e) {
      console.error('DataTable init error', e);
    }
  }

  private destroyDT(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const t = $('#ek-inspect-dt');
      if ($.fn.DataTable && $.fn.DataTable.isDataTable(t)) {
        t.DataTable().destroy();
      }
    } catch (_) {}
  }
}
