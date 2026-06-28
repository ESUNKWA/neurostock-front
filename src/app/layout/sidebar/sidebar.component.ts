import { Component, HostBinding, inject, OnDestroy, OnInit } from '@angular/core';
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
export class SidebarComponent implements OnInit, OnDestroy {
  menu = Menu;
  filteredMenu: any[] = [];
  currentUserProfile = '';

  @HostBinding('class.collapsed') collapsed = false;

  private authService = inject(AuthService);
  private bodyObserver?: MutationObserver;

  constructor(private router: Router) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        document.body.classList.remove('sidebar-mobile-open');
      }
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: any) => {
      if (user?.profil) {
        this.currentUserProfile = user.profil.code?.toLowerCase() || '';
        this.filteredMenu = this.filterMenuByRole(this.menu, this.currentUserProfile);
      } else {
        this.filteredMenu = this.menu;
      }
    });

    // Sync collapsed state when toggled from the header button
    this.bodyObserver = new MutationObserver(() => {
      this.collapsed = document.body.classList.contains('sidebar-collapsed');
    });
    this.bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  ngOnDestroy(): void {
    this.bodyObserver?.disconnect();
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    document.body.classList.toggle('sidebar-collapsed', this.collapsed);
  }

  closeMobile(): void {
    document.body.classList.remove('sidebar-mobile-open');
  }

  filterMenuByRole(menu: any[], role: string): any[] {
    const filteredMenu = JSON.parse(JSON.stringify(menu));

    if (role === 'admin') return filteredMenu;

    if (role === 'responsable_structure') {
      filteredMenu.forEach((section: any) => {
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
      return filteredMenu
        .filter((section: any) =>
          section.titre !== 'Gestion des utilisateurs' && section.titre !== 'Paramétrages'
        )
        .map((section: any) => {
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
}
