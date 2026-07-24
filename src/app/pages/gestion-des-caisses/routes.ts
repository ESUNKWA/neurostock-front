import { Routes } from '@angular/router';

const caisseRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./caisse.component'),
    title: 'neurostock | Caisse'
  },
  {
    path: 'rapport/:id',
    loadComponent: () => import('./rapport/rapport.component'),
    title: 'neurostock | Rapport de caisse'
  },
  {
    path: 'caisses',
    loadComponent: () => import('./caisses/caisses.component'),
    title: 'neurostock | Gestion des caisses'
  }
];

export default caisseRoutes;
