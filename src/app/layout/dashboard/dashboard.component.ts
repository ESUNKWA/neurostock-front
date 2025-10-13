import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../services/loader/loader.service';
import { Chart, registerables} from 'chart.js';
import { DashService } from '../../services/dash/dash.service';

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

  constructor(private loaderService: LoaderService, private dashService: DashService) {
    this.loaderService.showLoading();
    setTimeout(() => {
      this.loaderService.hideLoading();
    }, 1500);
  }


  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    const boutiqueId = 3;
    this.dashService.find(boutiqueId).subscribe({
      next: (response) => {
        
        this.stats = response;
         this.ventesParMois = this.stats.dash.vente_par_mois;
        this.createChart();
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement des stats :', err);
      }
    });
  }


   ngAfterViewInit(): void {
    
  }

  createChart(): void {
    const ctx = document.getElementById('myChart') as HTMLCanvasElement;
    if (!ctx) {
      console.error("Canvas introuvable !");
      return;
    }

    new Chart(ctx, {
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
