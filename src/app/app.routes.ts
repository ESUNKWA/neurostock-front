import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { ekwatechGuard } from './guards/ekwatech.guard';
import { RestaurantGuard } from './guards/restaurant.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full', title: 'neurostock | Connexion' },
    { path: 'login', loadComponent: () => import('./login/login.component'), title: 'neurostock | Connexion' },
    {
        path: 'change-password',
        loadComponent: () => import('./pages/change-password/change-password.component'),
        canActivate: [AuthGuard],
        title: 'neurostock | Changer le mot de passe'
    },
    { path: '', loadComponent: () => import('./home/home.component'), canActivate: [AuthGuard], children: [
        {
            path: 'dashboard',
            loadComponent: () => import('./layout/dashboard/dashboard.component'), 
            title: 'neurostock | Tableau de bord' 
        },
        { 
            path: 'gestion-des-produits', 
            loadChildren: () => import('./pages/gestion-des-produits/routes'), 
            title: 'neurostock | Gestion des produits' 
        },
        { 
            path: 'gestion-des-approvisionnements', 
            loadChildren: () => import('./pages/gestion-des-achats/routes'), 
            title: 'neurostock | Gestion des approvisionnements' 
        },
        {
            path: 'gestion-des-ventes',
            loadChildren: () => import('./pages/gestion-des-ventes/routes'),
            title: 'neurostock | Gestion des ventes'
        },
        {
            path: 'gestion-des-devis',
            loadChildren: () => import('./pages/gestion-des-devis/routes'),
            title: 'neurostock | Devis'
        },
        {
            path: 'clients',
            loadChildren: () => import('./pages/gestion-des-clients/routes'),
            title: 'neurostock | Clients'
        },
        {
            path: 'stocks',
            loadChildren: () => import('./pages/gestion-des-stocks/routes'),
            title: 'neurostock | Mouvements de stock'
        },
        {
            path: 'commandes-clients',
            loadChildren: () => import('./pages/gestion-des-commandes-clients/routes'),
            title: 'neurostock | Commandes clients'
        },
        {
            path: 'caisse',
            loadChildren: () => import('./pages/gestion-des-caisses/routes'),
            title: 'neurostock | Caisse'
        },

        // Gestion des utilisateurs
        {
            path: 'utilisateurs',
            loadChildren:()=> import('./pages/gestion-users/gestion.users.routes').then((u) => u.UsersRoutes),
            title: 'neurostock | Profil'
        },
        // Gestion des boutiques
        {
            path: 'structure',
            loadChildren:()=> import('./pages/gestion-boutiques/gestion.boutique.route').then((u) => u.boutiqueRoute),
            title: 'neurostock | Gestion des points de vente'
        },
        {
            path: 'analyse-ia',
            loadChildren: () => import('./pages/analyse-ia/routes'),
            title: 'neurostock | Analyse IA'
        },
        {
            path: 'recette',
            loadComponent: () => import('./pages/recette/recette.component'),
            title: 'neurostock | Recette'
        },
        {
            path: 'mon-abonnement',
            loadComponent: () => import('./pages/mon-abonnement/mon-abonnement.component'),
            title: 'neurostock | Mon abonnement'
        },
        {
            path: 'retours',
            loadChildren: () => import('./pages/gestion-des-retours/routes'),
            title: 'neurostock | Retours produits'
        },
    ]
    },
    // POS layout — for vendeur / caissier roles
    {
        path: 'pos',
        loadComponent: () => import('./layout/pos/pos-layout.component'),
        canActivate: [AuthGuard],
        children: [
            { path: '', loadChildren: () => import('./pages/pos/routes') }
        ]
    },
    // Ekwatech Super Admin — layout dédié, isolé du shell principal
    {
        path: 'ekwatech',
        loadComponent: () => import('./layout/ekwatech-admin/ekwatech-admin-layout.component'),
        canActivate: [ekwatechGuard],
        children: [
            { path: '', loadChildren: () => import('./pages/ekwatech-admin/routes') }
        ]
    },
    { path: 'abonnement-expire', loadComponent: () => import('./pages/abonnement-expire/abonnement-expire.component'), title: 'Abonnement expiré' },
    { path: 'no-access', loadComponent: () => import('./pages/no-access/no-access.component'), title: 'Accès non configuré' },
    { path: 'landing', loadComponent: () => import('./pages/landing/landing.component'), title: 'NeuroStock · Gérez vos points de vente intelligemment' },
    // Restaurant layout dédié
    {
        path: 'restaurant',
        loadComponent: () => import('./layout/restaurant-layout/restaurant-layout.component'),
        canActivate: [AuthGuard, RestaurantGuard],
        children: [
            { path: '', loadChildren: () => import('./pages/restaurant/routes') }
        ]
    },
    { path: 'inscription', loadComponent: () => import('./pages/inscription/inscription.component'), title: 'NeuroStock · Créer votre espace' },
    { path: 'menu', loadComponent: () => import('./pages/menu-client/menu-client.component'), title: 'Menu du jour' },
    { path: '**', redirectTo: 'dashboard' }
];
