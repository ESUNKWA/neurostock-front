import { Routes } from "@angular/router";


export const EntrepriseRoutes: Routes = [
    { path: '', redirectTo: 'structure', pathMatch: 'full' },
    { path: 'structure', loadComponent: () => import('./structure/structure.component'), title: "NeuroStock | Structure" },
    { path: 'boutique', loadComponent: () => import('./boutique/boutique.component'), title: "NeuroStock | Boutique" }
];

export default EntrepriseRoutes;