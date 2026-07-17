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
    path: 'storage',
    loadComponent: () => import('./storage/ek-storage.component'),
    title: 'Ekwatech | Stockage',
  },
  {
    path: 'inscriptions',
    loadComponent: () => import('./inscriptions/ek-inscriptions.component'),
    title: 'Ekwatech | Inscriptions',
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
  {
    path: 'frais-setup',
    loadComponent: () => import('./frais-setup/ek-frais-setup.component'),
    title: 'Ekwatech | Frais de mise en place',
  },
  {
    path: 'categories',
    loadComponent: () => import('./categories/ek-categories.component'),
    title: 'Ekwatech | Catégories de structures',
  },
  {
    path: 'profils',
    loadComponent: () => import('./profils/ek-profils.component'),
    title: 'Ekwatech | Profils utilisateurs',
  },
  {
    path: 'modules',
    loadComponent: () => import('./modules/ek-modules.component'),
    title: 'Ekwatech | Modules',
  },
];

export default routes;
