import { Routes } from "@angular/router";

export const AchatsRoutes: Routes = [
    { path: '', redirectTo: 'approvisionnement', pathMatch: 'full' },
    { path: 'approvisionnement', loadComponent: () => import('./achats/achats.component'), title: 'NeuroStock | Approvisionnements' },
    { path: 'historique-approvisionnements', loadComponent: () => import('./historique-achats/historique-achats.component'), title: 'NeuroStock | Historique des Approvisionnements' },
    { path: '**', redirectTo: 'approvisionnement', pathMatch: 'full' },
]

export default AchatsRoutes;
