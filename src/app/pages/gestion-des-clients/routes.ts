import { Routes } from '@angular/router';

export const ClientsRoutes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  { path: 'list', loadComponent: () => import('./clients/clients.component'), title: 'neurostock | Clients' },
  { path: '**', redirectTo: 'list', pathMatch: 'full' }
];

export default ClientsRoutes;
