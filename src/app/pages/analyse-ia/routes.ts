import { Routes } from '@angular/router';

const ANALYSE_IA_ROUTES: Routes = [
  {
    path: 'rupture-stock',
    loadComponent: () => import('./rupture-stock/rupture-stock.component'),
    title: 'NeuroStock | Prévision de rupture',
  },
  {
    path: 'scan-facture',
    loadComponent: () => import('./scan-facture/scan-facture.component'),
    title: 'NeuroStock | Scan de facture IA',
  },
  {
    path: 'resume-journalier',
    loadComponent: () => import('./resume-journalier/resume-journalier.component'),
    title: 'NeuroStock | Résumé journalier IA',
  },
  {
    path: 'prix-suggere',
    loadComponent: () => import('./prix-suggere/prix-suggere.component'),
    title: 'NeuroStock | Prix suggérés IA',
  },
];

export default ANALYSE_IA_ROUTES;
