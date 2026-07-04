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
  idBoutique: number = 0;
  currentUser: any = {};

  boutiqueService = inject(BoutiqueService);
  authService = inject(AuthService);
  chart: Chart | null = null;

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
    espece: 'Espèces',
    mobile_money: 'Mobile Money',
    carte: 'Carte bancaire',
    credit: 'Crédit',
  };

  modeEntries(obj: any): { mode: string; label: string; val: number }[] {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj)
      .filter(([, v]) => Number(v) > 0)
      .map(([mode, val]) => ({ mode, label: this.modesLabels[mode] ?? mode, val: Number(val) }));
  }

  constructor(
    private loaderService: LoaderService,
    private dashService: DashService,
    private previsionService: PrevisionService,
    public alerteService: AlerteService
  ) {
    this.loaderService.showLoading();
    setTimeout(() => {
      this.loaderService.hideLoading();
    }, 1500);
  }


  ngOnInit(): void {
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
              // Admin: attend la sélection manuelle (idBoutique reste 0)
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
        this.idBoutique = this.currentUser.boutique_id ?? 0;
        this.boutiques = this.currentUser.boutiques ?? (this.currentUser.boutique ? [this.currentUser.boutique] : []);
        if (this.idBoutique) this.loadStats();
    }
  }

  loadCaissierStats(): void {
    const boutiqueId = this.currentUser?.boutique_id ?? 0;
    const caissier = this.currentUser?.id ?? this.currentUser?.telephone;
    if (!boutiqueId || !caissier) {
      this.caissierStats = {};  // show empty state rather than staying null
      return;
    }
    this.isLoadingCaissier = true;
    
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

    this.dashService.find(boutiqueId).subscribe({
      next: (response) => {
        if (!response?.dash) return; // réponse vide ou erreur catchée
        this.stats = response;
        this.ventesParMois = this.stats.dash.vente_par_mois;

        // Mettre à jour le compteur commandes dans le header
        this.alerteService.setCommandesCount(response.dash?.commandes_client?.prevues_aujourd_hui ?? 0);

        // Variation ventes du jour
        const jr   = this.stats?.dash?.vente?.total_vente_jr   ?? 0;
        const hier = this.stats?.dash?.vente?.total_vente_hier  ?? 0;
        if (jr === 0 && hier === 0) {
          this.variationJr = 0;
        } else if (!hier) {
          this.variationJr = 100;
        } else {
          this.variationJr = Math.round(((jr - hier) / hier) * 100);
        }

        // Variation CA mensuel
        const mois      = this.stats?.dash?.vente?.total_vente_mois       ?? 0;
        const moisPasse = this.stats?.dash?.vente?.total_vente_mois_passe  ?? 0;
        if (mois === 0 && moisPasse === 0) {
          this.variationMois = 0;
        } else if (!moisPasse) {
          this.variationMois = 100;
        } else {
          this.variationMois = Math.round(((mois - moisPasse) / moisPasse) * 100);
        }

        this.createChart();
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement des stats :', err);
      }
    });
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
    const ctx = document.getElementById('myChart') as HTMLCanvasElement;
    if (!ctx) {
      console.error("Canvas introuvable !");
      return;
    }

    // ✅ Détruire le graphique précédent s’il existe
    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.ventesParMois?.map(v => v.mois), // noms des mois
        datasets: [{
          label: 'Chiffre d’affaires (F CFA)',
          data: this.ventesParMois?.map(v => v.montant), // montants
          fill: true,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
          tension: 0.3 // pour arrondir les courbes
        }]
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                // Affiche le montant avec F CFA
                 const value = context.raw as number; // caster en number
                  return `${value.toLocaleString('fr-FR')} F CFA`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return `${value.toLocaleString('fr-FR')}`;
              }
            }
          }
        }
      }
    });
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
