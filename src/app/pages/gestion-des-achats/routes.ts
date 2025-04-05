import { Routes } from "@angular/router";

export const AchatsRoutes: Routes = [
    { path: '', redirectTo: 'achats', pathMatch: 'full' },
    { path: 'achats', loadComponent: () => import('./achats/achats.component'), title: 'NeuroStock | Achats' },
    { path: 'historique-achats', loadComponent: () => import('./historique-achats/historique-achats.component'), title: 'NeuroStock | Historique des Achats' },
    { path: '**', redirectTo: 'achats', pathMatch: 'full' },
]

export default AchatsRoutes;
