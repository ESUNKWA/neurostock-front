import { Routes } from '@angular/router';

export const RestaurantRoutes: Routes = [
  { path: '',          redirectTo: 'tables', pathMatch: 'full' },
  { path: 'tables',    loadComponent: () => import('./tables/tables.component'),       title: 'neurostock | Plan de salle' },
  { path: 'commandes', loadComponent: () => import('./commandes/commandes.component'), title: 'neurostock | Commandes' },
  { path: 'recettes',  loadComponent: () => import('./recettes/recettes.component'),   title: 'neurostock | Menu / Recettes' },
  { path: 'commande',  loadComponent: () => import('./commande/commande.component'),   title: 'neurostock | Prise de commande' },
  { path: 'menu-jour', loadComponent: () => import('./menu-jour/menu-jour.component'), title: 'neurostock | Menu du jour' },
  { path: '**',       redirectTo: 'tables', pathMatch: 'full' },
];

export default RestaurantRoutes;
