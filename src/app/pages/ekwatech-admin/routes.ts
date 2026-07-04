import { Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/ek-dashboard.component'),
    title: 'Ekwatech | Vue d\'ensemble',
  },
  {
    path: 'structures',
    loadComponent: () => import('./structures/ek-structures.component'),
    title: 'Ekwatech | Structures',
  },
  {
    path: 'boutiques',
    loadComponent: () => import('./boutiques/ek-boutiques.component'),
    title: 'Ekwatech | Boutiques',
  },
  {
    path: 'tenants',
    loadComponent: () => import('./tenants/ek-tenants.component'),
    title: 'Ekwatech | Tenants',
  },
  {
    path: 'tenants/:structureId/tables',
    loadComponent: () => import('./tenants/ek-tenant-tables.component'),
    title: 'Ekwatech | Inspection DB',
  },
  {
    path: 'provision',
    loadComponent: () => import('./provision/ek-provision.component'),
    title: 'Ekwatech | Provisionner',
  },
  {
    path: 'abonnements',
    loadComponent: () => import('./abonnements/ek-abonnements.component'),
    title: 'Ekwatech | Abonnements',
  },
  {
    path: 'plans',
    loadComponent: () => import('./plans/ek-plans.component'),
    title: 'Ekwatech | Plans tarifaires',
  },
];

export default routes;
