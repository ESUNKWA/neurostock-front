import { Routes } from '@angular/router';
import { produitRoutes } from './pages/gestion-des-produits/routes';
import { GestionDesProduitsComponent } from './pages/gestion-des-produits/gestion-des-produits.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full', title: 'NeuroStock | Connexion' },
    { path: 'login', loadComponent: () => import('./login/login.component'), title: 'NeuroStock | Connexion' },
    { path: '', loadComponent: () => import('./home/home.component'), canActivate: [AuthGuard], children: [
        { path: 'dashboard', loadComponent: () => import('./layout/dashboard/dashboard.component'), title: 'NeuroStock | Tableau de bord' },
        { path: 'gestion-des-produits', component: GestionDesProduitsComponent, children: produitRoutes, title: 'NeuroStock | Gestion des produits' }
    ] },
    { path: '**', redirectTo: 'dashboard' }
];
