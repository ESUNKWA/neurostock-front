import { Routes } from '@angular/router';

const POS_ROUTES: Routes = [
  { path: '', redirectTo: 'vente', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/pos-dashboard.component'),
    title: 'NeuroStock | Mon tableau de bord',
  },
  {
    path: 'vente',
    loadComponent: () => import('./vente/pos-vente.component'),
    title: 'NeuroStock | Caisse POS',
  },
  {
    path: 'commandes',
    loadComponent: () => import('../gestion-des-commandes-clients/liste/liste.component'),
    title: 'NeuroStock | Commandes clients',
  },
  {
    path: 'commandes/nouvelle',
    loadComponent: () => import('../gestion-des-commandes-clients/form/form.component'),
    title: 'NeuroStock | Nouvelle commande',
  },
  {
    path: 'commandes/:id/edit',
    loadComponent: () => import('../gestion-des-commandes-clients/form/form.component'),
    title: 'NeuroStock | Modifier commande',
  },
  {
    path: 'devis',
    loadComponent: () => import('../gestion-des-devis/historique-devis/historique-devis.component'),
    title: 'NeuroStock | Devis',
  },
  {
    path: 'devis/nouveau',
    loadComponent: () => import('../gestion-des-devis/nouveau-devis/nouveau-devis.component'),
    title: 'NeuroStock | Nouveau devis',
  },
  {
    path: 'historique',
    loadComponent: () => import('../gestion-des-ventes/historique-ventes/historique-ventes.component'),
    title: 'NeuroStock | Historique des ventes',
  },
  {
    path: 'caisse',
    loadComponent: () => import('../gestion-des-caisses/caisse.component'),
    title: 'NeuroStock | Caisse',
  },
  {
    path: 'caisse/rapport/:id',
    loadComponent: () => import('../gestion-des-caisses/rapport/rapport.component'),
    title: 'NeuroStock | Rapport de caisse',
  },
  {
    path: 'retours',
    loadComponent: () => import('../gestion-des-retours/historique-retours/historique-retours.component'),
    title: 'NeuroStock | Retours produits',
  },
  {
    path: 'retours/nouveau',
    loadComponent: () => import('../gestion-des-retours/nouveau-retour/nouveau-retour.component'),
    title: 'NeuroStock | Nouveau retour',
  },
];

export default POS_ROUTES;
