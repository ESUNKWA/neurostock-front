import { Routes } from '@angular/router';

export const StocksRoutes: Routes = [
  { path: '', redirectTo: 'mouvements', pathMatch: 'full' },
  { path: 'mouvements', loadComponent: () => import('./mouvements/mouvements.component'), title: 'neurostock | Mouvements de stock' },
  { path: '**', redirectTo: 'mouvements', pathMatch: 'full' }
];

export default StocksRoutes;
