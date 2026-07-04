import { Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'historique', pathMatch: 'full' },
  {
    path: 'historique',
    loadComponent: () => import('./historique-retours/historique-retours.component'),
    title: 'neurostock | Retours produits',
  },
  {
    path: 'nouveau',
    loadComponent: () => import('./nouveau-retour/nouveau-retour.component'),
    title: 'neurostock | Nouveau retour',
  },
];

export default routes;
