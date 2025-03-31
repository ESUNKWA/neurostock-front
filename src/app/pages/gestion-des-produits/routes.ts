import { Routes } from '@angular/router';

export const produitRoutes: Routes = [
    { path: '', redirectTo: 'categorie', pathMatch: 'full', title: 'NeuroStock | Gestion des produits | Catégorie' },
    { path: 'categorie', loadComponent: ()=> import('./categorie/categorie.component'), title: 'NeuroStock | Gestion des produits | Catégorie' },
    { path: 'fournisseur', loadComponent: ()=> import('./fournisseur/fournisseur.component'), title: 'NeuroStock | Gestion des produits | Fournisseur' },
    { path: 'produit', loadComponent: ()=> import('./produit/produit.component'), title: 'NeuroStock | Gestion des produits | Produit' }
]