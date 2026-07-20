import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AlerteService } from '../../services/alerte/alerte.service';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../services/loader/loader.service';
import { Chart, registerables} from 'chart.js';
import { DashService } from '../../services/dash/dash.service';
import { BoutiqueService } from '../../services/boutique/boutique.service';
import { AuthService } from '../../services/auth/auth.service';
import { environnement } from '../../environnement/environnement';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { PrevisionService } from '../../services/analyse-ia/prevision.service';
import { DeviceService } from '../../services/device/device.service';

declare var $: any;

Chart.register(...registerables);


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule, NzSpinModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export default class DashboardComponent implements OnInit, OnDestroy {

  stats: any;
   // Exemple de chiffre d'affaires par mois
  ventesParMois = [
    { mois: 'Janvier', montant: 1200 },
    { mois: 'Février', montant: 150000 },
    { mois: 'Mars', montant: 90000 },
    { mois: 'Avril', montant: 200000 },
    { mois: 'Mai', montant: 180000 },
    { mois: 'Juin', montant: 220000 },
    { mois: 'Juillet', montant: 250000 },
    { mois: 'Août', montant: 300000 },
    { mois: 'Septembre', montant: 270000 },
    { mois: 'Octobre', montant: 310000 },
    { mois: 'Novembre', montant: 280000 },
    { mois: 'Décembre', montant: 350000 }
  ];


  boutiques: any = [];
  idBoutique: number | null = null;
  currentUser: any = {};

  private sseSource: EventSource | null = null;
  private sseBoutiqueId: number | null = null;

  boutiqueService = inject(BoutiqueService);
  authService = inject(AuthService);
  chart: Chart | null = null;
  chartMob: Chart | null = null;

  api_url: string = environnement.API_URL;
  today = new Date();
  variationJr: number = 0;
  variationMois: number = 0;

  resumeJournalier: any | null = null;
  isLoadingResume = false;

  // ── Caissier / Vendeur dashboard ─────────────────────────────────────────────
  caissierStats: any = null;
  isLoadingCaissier = false;

  private readonly CAISSIER_PROFILES = ['caissier', 'vendeur', 'gerant', 'user'];

  get isCaissierView(): boolean {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    return this.CAISSIER_PROFILES.includes(code);
  }

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

  modeEntries(obj: any): { mode: string; label: string; val: number }[] {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj)
      .filter(([, v]) => Number(v) > 0)
      .map(([mode, val]) => ({ mode, label: this.modesLabels[mode] ?? mode, val: Number(val) }));
  }

  isMobile = false;

  readonly mobileModules = [
    { label: 'Ventes',          icon: 'bi-receipt',           lien: '/gestion-des-ventes/vente',                              color: '#059669', bg: '#d1fae5' },
    { label: 'Produits',        icon: 'bi-box-seam',          lien: '/gestion-des-produits/produit',                          color: '#8b5cf6', bg: '#ede9fe' },
    { label: 'Approvisionnements', icon: 'bi-cart4',          lien: '/gestion-des-approvisionnements/approvisionnement',      color: '#d97706', bg: '#fef3c7' },
    { label: 'Caisse',          icon: 'bi-cash-coin',         lien: '/caisse',                                                color: '#0369a1', bg: '#e0f2fe' },
    { label: 'Clients',         icon: 'bi-people',            lien: '/clients/list',                                          color: '#0891b2', bg: '#cffafe' },
    { label: 'Devis',           icon: 'bi-file-earmark-text', lien: '/gestion-des-devis/historique',                          color: '#4f46e5', bg: '#e0e7ff' },
    { label: 'Commandes',       icon: 'bi-bag-check',         lien: '/commandes-clients/liste',                               color: '#db2777', bg: '#fce7f3' },
    { label: 'Retours',         icon: 'bi-arrow-return-left', lien: '/retours/historique',                                    color: '#dc2626', bg: '#fee2e2' },
    { label: 'Mouvements',      icon: 'bi-arrow-left-right',  lien: '/stocks/mouvements',                                     color: '#374151', bg: '#f3f4f6' },
    { label: 'Recette',         icon: 'bi-cash-stack',        lien: '/recette',                                               color: '#0d9488', bg: '#ccfbf1' },
    { label: 'Analyse IA',      icon: 'bi-stars',             lien: '/analyse-ia/resume-journalier',                          color: '#7c3aed', bg: '#ede9fe' },
    { label: 'Utilisateurs',    icon: 'bi-person-workspace',  lien: '/utilisateurs/list',                                     color: '#374151', bg: '#f9fafb' },
  ];

  constructor(
    private loaderService: LoaderService,
    private dashService: DashService,
    private previsionService: PrevisionService,
    public alerteService: AlerteService,
    private deviceSvc: DeviceService
  ) {
    this.loaderService.showLoading();
    setTimeout(() => {
      this.loaderService.hideLoading();
    }, 1500);
  }


  ngOnInit(): void {
    this.deviceSvc.isMobile$.subscribe(m => this.isMobile = m);
    this.getCurrentUser();

    if (this.isCaissierView) {
      this.loadCaissierStats();
    } else {
      this.loadBoutiques();
      // loadStats() est appelé depuis loadBoutiques() une fois l'idBoutique résolu
    }
  }

  ngOnDestroy(): void {
    window.speechSynthesis?.cancel();
    this.stopSSE();
    this.chart?.destroy();
    this.chartMob?.destroy();
  }

  getCurrentUser() {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
    });
  }

  loadBoutiques(): void {
    const code = this.currentUser?.profil?.code;
    switch(code){

      case 'admin':
        this.boutiqueService.find().subscribe({
          next: (response: any) => {
            if (response.status === 'success' && response.data) {
              this.boutiques = response.data;
              if (this.boutiques.length > 0) {
                this.idBoutique = this.boutiques[0].id;
                this.loadStats();
              }
            }
          },
          error: (error: any) => {
            console.error('Erreur lors du chargement des boutiques:', error);
          }
        });
        break;

      case 'responsable_structure':
        this.boutiques = this.currentUser.boutiques ?? [];
        // Auto-sélectionner la première boutique et charger les stats
        if (this.boutiques.length > 0) {
          this.idBoutique = this.boutiques[0].id;
          this.loadStats();
        }
        break;

      default:
        // gérant et autres rôles non-caissier avec boutique assignée
        this.idBoutique = this.currentUser.boutique_id ?? null;
        this.boutiques = this.currentUser.boutiques ?? (this.currentUser.boutique ? [this.currentUser.boutique] : []);
        if (this.idBoutique) this.loadStats();
    }
  }

  loadCaissierStats(): void {
    const boutiqueId = this.currentUser?.boutique_id ?? 0;
    const caissier = this.currentUser?.id ?? this.currentUser?.telephone;
    if (!boutiqueId || !caissier) {
      this.caissierStats = {};
      return;
    }
    this.isLoadingCaissier = true;
    this.startSSE(boutiqueId);

    this.dashService.findCaissier(boutiqueId, caissier).subscribe({
      next: (res: any) => {
        this.caissierStats = res;
        this.isLoadingCaissier = false;
      },
      error: () => {
        this.caissierStats = {};
        this.isLoadingCaissier = false;
      }
    });
  }

  loadStats(): void {
    const boutiqueId = this.currentUser.profil.code === 'admin' || this.currentUser.profil.code === 'responsable_structure'
      ? this.idBoutique
      : this.currentUser.boutique_id;

    this.loadResumeJournalier(boutiqueId);
    this.startSSE(boutiqueId);

    this.dashService.find(boutiqueId).subscribe({
      next: (response) => {
        if (!response?.dash) return;
        this.applyStats(response);
        setTimeout(() => this.createChart(), 0);
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement des stats :', err);
      }
    });
  }

  // ── SSE — mise à jour temps réel ───────────────────────────────────────────
  private startSSE(boutiqueId: number): void {
    if (!boutiqueId) return;
    if (this.sseBoutiqueId === boutiqueId && this.sseSource) return;
    this.stopSSE();
    const url = `${this.api_url}/events/stream?boutique=${boutiqueId}`;
    this.sseSource     = new EventSource(url);
    this.sseBoutiqueId = boutiqueId;

    // Événement nommé — format SSE standard : "event: vente.created"
    this.sseSource.addEventListener('vente.created', () => {
      this.refreshStatsSilent(boutiqueId);
    });

    // Fallback : si le backend envoie un événement générique "message" sans event:
    this.sseSource.addEventListener('message', (e: MessageEvent) => {
      const payload = e.data?.trim?.();
      if (!payload || payload === 'ping') return; // ignorer heartbeat
      this.refreshStatsSilent(boutiqueId);
    });
  }

  private stopSSE(): void {
    this.sseSource?.close();
    this.sseSource     = null;
    this.sseBoutiqueId = null;
  }

  // Rafraîchit les stats sans spinner ni clignotement
  private refreshStatsSilent(boutiqueId: number): void {
    if (this.isCaissierView) {
      this.loadCaissierStatsSilent();
    } else {
      this.dashService.find(boutiqueId).subscribe({
        next: (response) => {
          if (!response?.dash) return;
          this.applyStats(response);
          setTimeout(() => this.createChart(), 0);
        }
      });
    }
  }

  private loadCaissierStatsSilent(): void {
    const boutiqueId = this.currentUser?.boutique_id ?? 0;
    const caissier   = this.currentUser?.id ?? this.currentUser?.telephone;
    if (!boutiqueId || !caissier) return;
    this.dashService.findCaissier(boutiqueId, caissier).subscribe({
      next: (res: any) => { this.caissierStats = res; }
    });
  }

  // Applique la réponse API aux propriétés du composant (partagé entre chargement initial et SSE)
  private applyStats(response: any): void {
    this.stats         = response;
    this.ventesParMois = this.stats.dash.vente_par_mois;

    this.alerteService.setCommandesCount(response.dash?.commandes_client?.prevues_aujourd_hui ?? 0);

    const ruptureProduits = (response.dash?.produit?.stock_rupture ?? []).map((p: any) => ({
      nom: p.nom, type: 'rupture', stock: p.stock_disponible,
    }));
    const alerteProduits = (response.dash?.produit?.stock_alert ?? [])
      .filter((p: any) => p.stock_disponible <= p.seuil_alert && p.stock_disponible !== 0)
      .map((p: any) => ({ nom: p.nom, type: 'alerte', stock: p.stock_disponible, seuil: p.seuil_alert }));
    this.alerteService.setAlertProduits([...ruptureProduits, ...alerteProduits]);

    const jr   = this.stats?.dash?.vente?.total_vente_jr   ?? 0;
    const hier = this.stats?.dash?.vente?.total_vente_hier  ?? 0;
    if (jr === 0 && hier === 0)  { this.variationJr = 0; }
    else if (!hier)               { this.variationJr = 100; }
    else                          { this.variationJr = Math.round(((jr - hier) / hier) * 100); }

    const mois      = this.stats?.dash?.vente?.total_vente_mois       ?? 0;
    const moisPasse = this.stats?.dash?.vente?.total_vente_mois_passe  ?? 0;
    if (mois === 0 && moisPasse === 0) { this.variationMois = 0; }
    else if (!moisPasse)                { this.variationMois = 100; }
    else                                { this.variationMois = Math.round(((mois - moisPasse) / moisPasse) * 100); }
  }

  loadResumeJournalier(boutiqueId: number): void {
    if (!boutiqueId) return;
    this.isLoadingResume = true;
    this.previsionService.getResumeJournalier(boutiqueId).subscribe({
      next: (res: any) => {
        this.resumeJournalier = res?.data ?? res;
        this.isLoadingResume = false;
      },
      error: () => {
        this.isLoadingResume = false;
      }
    });
  }

  createChart(): void {
    this._buildChart('myChart');
    this._buildChart('myChartMob');
  }

  private _buildChart(id: string): void {
    const ctx = document.getElementById(id) as HTMLCanvasElement;
    if (!ctx) return;

    if (id === 'myChart') { this.chart?.destroy(); this.chart = null; }
    else                  { this.chartMob?.destroy(); this.chartMob = null; }

    const ch = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.ventesParMois?.map(v => v.mois),
        datasets: [{
          label: "Chiffre d'affaires (F CFA)",
          data: this.ventesParMois?.map(v => v.montant),
          fill: true,
          backgroundColor: 'rgba(54, 162, 235, 0.18)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: id === 'myChartMob' ? 2 : 3,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${(context.raw as number).toLocaleString('fr-FR')} F CFA`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              maxTicksLimit: 5,
              callback: (value) => `${Number(value).toLocaleString('fr-FR')}`
            }
          },
          x: {
            ticks: { font: { size: id === 'myChartMob' ? 9 : 12 } }
          }
        }
      }
    });

    if (id === 'myChart') this.chart = ch;
    else                  this.chartMob = ch;
  }


  get alertesCount(): number {
    const r = this.stats?.dash?.produit?.stock_rupture?.length ?? 0;
    const a = this.stats?.dash?.produit?.stock_alert?.length ?? 0;
    return r + a;
  }

  replayAlert(): void {
    const ruptures = this.stats?.dash?.produit?.stock_rupture?.length ?? 0;
    const alertes  = this.stats?.dash?.produit?.stock_alert?.length  ?? 0;
    this.alerteService.playSound(ruptures, alertes);
  }

  // Calculer la largeur relative de la barre (en %)
  getBarWidth(qte: number) {
    const max = Math.max(...this.stats?.dash?.vente?.top_dix.map((p: { quantite_vendu: any; }) => p.quantite_vendu));
    return (qte / max) * 100;
  }

}
