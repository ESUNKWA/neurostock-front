import { Routes } from '@angular/router';

export const CommandeClientRoutes: Routes = [
  { path: '', redirectTo: 'liste', pathMatch: 'full' },
  { path: 'liste',    loadComponent: () => import('./liste/liste.component'),  title: 'neurostock | Commandes clients' },
  { path: 'nouvelle', loadComponent: () => import('./form/form.component'),    title: 'neurostock | Nouvelle commande' },
  { path: ':id/edit', loadComponent: () => import('./form/form.component'),    title: 'neurostock | Modifier la commande' },
  { path: '**', redirectTo: 'liste' },
];

export default CommandeClientRoutes;
