import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashService } from '../../../services/dash/dash.service';
import { AuthService } from '../../../services/auth/auth.service';
import { DeviceService } from '../../../services/device/device.service';

declare var $: any;

@Component({
  selector: 'app-pos-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pos-dashboard.component.html',
  styleUrl: './pos-dashboard.component.scss'
})
export default class PosDashboardComponent implements OnInit, OnDestroy {
  currentUser: any;
  stats: any = null;
  isLoading = false;
  isMobile = false;
  today = new Date();

  private dtTimer: any = null;

  readonly modesLabels: Record<string, string | undefined> = {
    espece:       'Espèces',
    carte:        'Carte bancaire',
    credit:       'Crédit',
    orange_money: 'Orange Money',
    wave:         'Wave',
    mtn_money:    'MTN Money',
    moov_money:   'Moov Money',
    dajmo:        'Dajmo',
    mixte:        'Mixte',
  };

  constructor(
    private dashService: DashService,
    private authService: AuthService,
    private deviceSvc: DeviceService,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  ngOnInit(): void {
    this.deviceSvc.isMobile$.subscribe(m => this.isMobile = m);
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      if (user) this.load();
    });
  }

  ngOnDestroy(): void {
    this.destroyProdTable();
  }

  load(): void {
    const boutiqueId = this.currentUser?.boutique_id ?? this.currentUser?.boutique?.id;
    const caissier   = this.currentUser?.id ?? this.currentUser?.telephone;
    if (!boutiqueId || !caissier) return;

    this.isLoading = true;
    this.dashService.findCaissier(boutiqueId, caissier).subscribe({
      next: (res: any) => {
        this.stats = res?.data ?? res;
        this.isLoading = false;
        this.destroyProdTable();
        clearTimeout(this.dtTimer);
        this.dtTimer = setTimeout(() => this.initProdTable(), 80);
      },
      error: () => { this.stats = {}; this.isLoading = false; },
    });
  }

  private destroyProdTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const t = $('.pd-prod-dt');
      if ($.fn.DataTable?.isDataTable(t)) t.DataTable().destroy();
    } catch {}
  }

  private initProdTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const produits: any[] = this.stats?.produits ?? [];
    if (!produits.length) return;
    try {
      $('.pd-prod-dt').DataTable({
        data: produits,
        columns: [
          {
            data: 'nom',
            render: (d: any) =>
              `<span class="pd-prod-name">${d ?? '—'}</span>`
          },
          {
            data: 'prix_unitaire',
            className: 'text-end text-muted',
            render: (d: any) =>
              `<span style="font-size:.76rem">${Number(d).toLocaleString('fr')} F</span>`
          },
          {
            data: 'quantite_vendue',
            className: 'text-center',
            render: (d: any) =>
              `<span class="pd-qty-badge">${d}</span>`
          },
          {
            data: 'montant_total',
            className: 'text-end fw-semibold',
            render: (d: any) =>
              `${Number(d).toLocaleString('fr')} F`
          },
        ],
        pageLength: 10,
        lengthChange: false,
        ordering: true,
        searching: true,
        info: true,
        pagingType: 'simple_numbers',
        language: {
          search:     '',
          searchPlaceholder: 'Rechercher un produit…',
          emptyTable: 'Aucun produit vendu',
          info:       '_START_–_END_ sur _TOTAL_',
          infoEmpty:  '0 résultat',
          zeroRecords:'Aucun résultat',
          paginate:   { previous: '‹', next: '›', first: '', last: '' },
        },
        dom: '<"pd-dt-top"f>t<"pd-dt-bottom"ip>',
      });
    } catch (e) {
      console.error('DataTable init error', e);
    }
  }

  modeEntries(): { label: string; val: number; mode: string }[] {
    const obj = this.stats?.par_mode_paiement;
    if (!obj) return [];
    return Object.entries(obj)
      .filter(([, v]) => Number(v) > 0)
      .map(([mode, val]) => ({ label: this.modesLabels[mode] ?? mode, val: Number(val), mode }));
  }

  get fondOuvertureTotal(): number {
    const fond = this.stats?.session_caisse?.fond_ouverture;
    if (!fond) return 0;
    return Object.values(fond as Record<string, number>).reduce((acc, v) => acc + (v ?? 0), 0);
  }

  get fondOuvertureEntries(): { mode: string; val: number }[] {
    const fond = this.stats?.session_caisse?.fond_ouverture;
    if (!fond) return [];
    return Object.entries(fond as Record<string, number>)
      .filter(([, v]) => (v ?? 0) > 0)
      .map(([mode, val]) => ({ mode, val: Number(val) }));
  }

  get panierMoyen(): number {
    if (!this.stats?.nb_ventes) return 0;
    return Math.round(this.stats.chiffre_affaires / this.stats.nb_ventes);
  }
}
