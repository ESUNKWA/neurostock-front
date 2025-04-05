import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full', title: 'NeuroStock | Connexion' },
    { path: 'login', loadComponent: () => import('./login/login.component'), title: 'NeuroStock | Connexion' },
    { path: '', loadComponent: () => import('./home/home.component'), canActivate: [AuthGuard], children: [
        { path: 'dashboard', loadComponent: () => import('./layout/dashboard/dashboard.component'), title: 'NeuroStock | Tableau de bord' },
        { path: 'gestion-des-produits', loadChildren: () => import('./pages/gestion-des-produits/routes'), title: 'NeuroStock | Gestion des produits' },
                
        // Gestion des utilisateurs
        { 
            path: 'utilisateurs', 
            loadChildren:()=> import('./pages/gestion-users/gestion.users.routes').then((u) => u.UsersRoutes),
            title: 'NeuroStock | Profil' 
        },
        // Gestion des boutiques
        { 
            path: 'structure', 
            loadChildren:()=> import('./pages/gestion-boutiques/gestion.boutique.route').then((u) => u.boutiqueRoute),
            title: 'NeuroStock | Profil' 
        },
    ] 
    },
    { path: '**', redirectTo: 'dashboard' }
];
