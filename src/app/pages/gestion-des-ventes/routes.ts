import { Routes } from '@angular/router';

export const ventesRoutes: Routes = [
    { path: '', redirectTo: 'vente', pathMatch: 'full', title: 'neurostock | Gestion des ventes' },
    { path: 'vente', loadComponent: ()=> import('./vente/vente.component'), title: 'neurostock | Gestion des ventes' },
    { path: 'historique-ventes', loadComponent: ()=> import('./historique-ventes/historique-ventes.component'), title: 'neurostock | Gestion des ventes' },
    { path: 'comptage', loadComponent: ()=> import('./comptage/comptage.component'), title: 'neurostock | Point après vente' },
]

export default ventesRoutes;