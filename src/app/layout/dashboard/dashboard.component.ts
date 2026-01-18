import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../services/loader/loader.service';
import { Chart, registerables} from 'chart.js';
import { DashService } from '../../services/dash/dash.service';
import { BoutiqueService } from '../../services/boutique/boutique.service';
import { AuthService } from '../../services/auth/auth.service';
import { environnement } from '../../environnement/environnement';

declare var $: any;

Chart.register(...registerables);


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export default class DashboardComponent implements OnInit{

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
  chart: Chart | null = null; // 👈 stocke l’instance du graphique

  api_url: string = environnement.API_URL;
  variationJr: number = 0;
  variationMois: number = 0;

  constructor(private loaderService: LoaderService, private dashService: DashService) {
    this.loaderService.showLoading();
    setTimeout(() => {
      this.loaderService.hideLoading();
    }, 1500);
  }


  ngOnInit(): void {
    this.getCurrentUser();
    this.loadBoutiques();
    
  }
  

  getCurrentUser() {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
    });
  }

  loadBoutiques(): void {

    switch(this.currentUser.profil.code.toLowerCase()){

      case 'admin':
        
        this.boutiqueService.find().subscribe({
          next: (response: any) => {
            if (response.status === 'success' && response.data) {
              this.boutiques = response.data;
              
            }
          },
          error: (error: any) => {
            console.error('Erreur lors du chargement des boutiques:', error);
          }
        });
        break;

      case 'responsable_structure':
        this.boutiques = this.currentUser.structure[0].boutique;
        break;

        default:
          this.boutiques[0] = this.currentUser.boutique;
    }

   
    
  }

  loadStats(): void {
    const boutiqueId = this.idBoutique;
    this.dashService.find(boutiqueId).subscribe({
      next: (response) => {
        
        this.stats = response;
        this.ventesParMois = this.stats.dash.vente_par_mois;

        //Calcul de la variation des ventes du jour
        this.variationJr = ((this.stats?.dash?.vente?.total_vente_jr - this.stats?.dash?.vente?.total_vente_hier)/this.stats?.dash?.vente?.total_vente_hier) * 100;
        this.variationJr = Math.round(this.variationJr);
        
        //Calcul de la variation des ventes du mois
        this.variationMois = ((this.stats?.dash?.vente?.total_vente_mois - this.stats?.dash?.vente?.total_vente_mois_passe)/this.stats?.dash?.vente?.total_vente_mois_passe) * 100;
        this.variationMois = Math.round(this.variationMois);

        this.createChart();
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement des stats :', err);
      }
    });
  }


   ngAfterViewInit() {
    // Initialisation de Select2
    ($('#mySelect') as any).select2({
      placeholder: 'Sélectionner une boutique',
      allowClear: true,
      width: 'resolve',
    });

    // Gérer les changements
    ($('#mySelect') as any).on('change', (e: any) => {
      const idBoutique = ($('#mySelect') as any).val();

      this.idBoutique = parseInt(idBoutique);
      this.loadStats();
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
        labels: this.ventesParMois.map(v => v.mois), // noms des mois
        datasets: [{
          label: 'Chiffre d’affaires (F CFA)',
          data: this.ventesParMois.map(v => v.montant), // montants
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

  // Calculer la largeur relative de la barre (en %)
  getBarWidth(qte: number) {
    const max = Math.max(...this.stats?.dash?.vente?.top_dix.map((p: { quantite_vendu: any; }) => p.quantite_vendu));
    return (qte / max) * 100;
  }

}
