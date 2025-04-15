import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full', title: 'neurostock | Connexion' },
    { path: 'login', loadComponent: () => import('./login/login.component'), title: 'neurostock | Connexion' },
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
            title: 'neurostock | Gestion des boutiques' 
        },
    ] 
    },
    { path: '**', redirectTo: 'dashboard' }
];
