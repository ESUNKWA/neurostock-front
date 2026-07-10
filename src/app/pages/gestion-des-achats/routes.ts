import { Routes } from "@angular/router";

export const AchatsRoutes: Routes = [
    { path: '', redirectTo: 'approvisionnement', pathMatch: 'full' },
    { path: 'approvisionnement', loadComponent: () => import('./achats/achats.component'), title: 'neurostock | Approvisionnements' },
    { path: 'historique-approvisionnements', loadComponent: () => import('./historique-achats/historique-achats.component'), title: 'neurostock | Historique des Approvisionnements' },
    { path: 'commandes-fournisseur', loadComponent: () => import('./commande-fournisseur/liste/liste.component'), title: 'neurostock | Commandes fournisseurs' },
    { path: 'commandes-fournisseur/nouvelle', loadComponent: () => import('./commande-fournisseur/form/form.component'), title: 'neurostock | Nouvelle commande fournisseur' },
    { path: 'commandes-fournisseur/:id/edit', loadComponent: () => import('./commande-fournisseur/form/form.component'), title: 'neurostock | Modifier commande fournisseur' },
    { path: '**', redirectTo: 'approvisionnement', pathMatch: 'full' },
]

export default AchatsRoutes;
