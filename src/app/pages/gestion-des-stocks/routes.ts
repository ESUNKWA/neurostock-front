import { Routes } from '@angular/router';

export const StocksRoutes: Routes = [
  { path: '', redirectTo: 'mouvements', pathMatch: 'full' },
  { path: 'mouvements', loadComponent: () => import('./mouvements/mouvements.component'), title: 'neurostock | Mouvements de stock' },
  { path: 'transferts', loadComponent: () => import('./transferts/transferts.component'), title: 'neurostock | Transferts de stock' },
  { path: 'rapport-transferts', loadComponent: () => import('./rapport-transferts/rapport-transferts.component'), title: 'neurostock | Rapport ventes transferts' },
  { path: '**', redirectTo: 'mouvements', pathMatch: 'full' }
];

export default StocksRoutes;
