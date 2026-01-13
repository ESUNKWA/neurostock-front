import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { Menu } from './menu';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {
  userRole: string = ''; 
  menu = Menu;
  filteredMenu: any[] = [];
  isActive = 'nav-link collapsed';
  currentUserProfile: string = '';

  private authService = inject(AuthService);

  constructor(private router: Router) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isActive = this.router.url === '/dashboard' ? 'nav-link' : 'nav-link collapsed';
      }
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: any) => {
      if (user && user.profil) {
        this.currentUserProfile = user.profil.code?.toLowerCase() || '';
      
        this.filteredMenu = this.filterMenuByRole(this.menu, this.currentUserProfile);
      } else {
        this.filteredMenu = this.menu;
      }
    });
  }
  

  /**
   * 🔒 Filtrer le menu selon le rôle de l'utilisateur
   */
  filterMenuByRole(menu: any[], role: string): any[] {
    // Clone du menu de base pour éviter les mutations
    const filteredMenu = JSON.parse(JSON.stringify(menu));

    if (role === 'admin') {
      return filteredMenu; // L’admin voit tout
    }

    if (role === 'responsable_structure') {
      // Retirer les sous-menus Profil et Structure
      filteredMenu.forEach((section: { menu: any[]; }) => {
        section.menu?.forEach((item: any) => {
          if (item.sousMenu) {
            item.sousMenu = item.sousMenu.filter((s: any) => 
              s.libelle !== 'Profil' && s.libelle !== 'Structure'
            );
          }
        });
      });
    }

    if (role === 'gerant' || role === 'user') {
      // Supprimer le menu Gestion des utilisateurs et Gestion des boutiques
      return filteredMenu
        .filter((section: { titre: string; }) => section.titre !== 'Gestion des utilisateurs' && section.titre !== 'Paramétrages' )
        .map((section: { menu: any[]; }) => {
          // Supprimer les sous-menus Catégories et Fournisseurs s’ils existent
          section.menu?.forEach((item: any) => {
            if (item.sousMenu) {
              item.sousMenu = item.sousMenu.filter((s: any) => 
                s.libelle !== 'Catégories' && s.libelle !== 'Fournisseurs' && s.libelle !== 'Structure'
              );
            }
          });
          return section;
        });
    }

    return filteredMenu;
  }
  
  /**
   * Filtre les éléments du menu en fonction du profil de l'utilisateur
   */
  filterMenuByProfile(): void {
    const restrictedProfiles = ['user', 'autre', 'responsable_structure'];
    
    // Clone du menu original
    this.filteredMenu = JSON.parse(JSON.stringify(this.menu));
    
    // Si l'utilisateur a un profil restreint
    if (restrictedProfiles.includes(this.currentUserProfile)) {
      
      // 1. Filtrer la section "Gestion des utilisateurs"
      this.filteredMenu = this.filteredMenu.filter((menuItem: any) => 
        menuItem.titre !== 'Gestion des utilisateurs'
      );
      
      // 2. Parcourir les sections restantes pour filtrer les sous-menus spécifiques
      this.filteredMenu.forEach((menuItem: any) => {
        if (menuItem.menu) {
          // Filtrer les menus de niveau 2
          menuItem.menu = menuItem.menu.filter((submenu: any) => {
            // Exclure entièrement "Gestion des boutiques"
            return submenu.libelle !== 'Gestion des boutiques';
          });
          
          menuItem.menu.forEach((submenu: any) => {
            // Si c'est le menu "Gestion des produits"
            if (submenu.libelle === 'Gestion des produits' && submenu.sousMenu) {
              // Filtrer les sous-menus Catégories et Fournisseurs
              submenu.sousMenu = submenu.sousMenu.filter((item: any) => 
                item.libelle !== 'Catégories' && item.libelle !== 'Fournisseurs'
              );
            }
          });
        }
      });
    }
  }
}
