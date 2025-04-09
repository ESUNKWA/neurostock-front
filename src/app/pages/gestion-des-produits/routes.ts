import { Routes } from '@angular/router';

export const produitRoutes: Routes = [
    { path: '', redirectTo: 'categorie', pathMatch: 'full', title: 'neurostock | Gestion des produits | Catégorie' },
    { path: 'categorie', loadComponent: ()=> import('./categorie/categorie.component'), title: 'neurostock | Gestion des produits | Catégorie' },
    { path: 'fournisseur', loadComponent: ()=> import('./fournisseur/fournisseur.component'), title: 'neurostock | Gestion des produits | Fournisseur' },
    { path: 'produit', loadComponent: ()=> import('./produit/produit.component'), title: 'neurostock | Gestion des produits | Produit' },
]

export default produitRoutes;