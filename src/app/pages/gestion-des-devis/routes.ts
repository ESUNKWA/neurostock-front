import { Routes } from '@angular/router';

export const DevisRoutes: Routes = [
  { path: '', redirectTo: 'historique', pathMatch: 'full' },
  { path: 'nouveau', loadComponent: () => import('./nouveau-devis/nouveau-devis.component'), title: 'neurostock | Nouveau Devis' },
  { path: 'historique', loadComponent: () => import('./historique-devis/historique-devis.component'), title: 'neurostock | Historique des Devis' },
  { path: '**', redirectTo: 'historique', pathMatch: 'full' }
];

export default DevisRoutes;
