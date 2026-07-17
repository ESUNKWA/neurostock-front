import { Component, HostBinding, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { Menu } from './menu';
import { AuthService } from '../../services/auth/auth.service';
import { ModuleService, ModuleCode } from '../../services/modules/module.service';

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

  @HostBinding('class.collapsed')   collapsed   = false;
  @HostBinding('class.mobile-open') mobileOpen  = false;

  private authService = inject(AuthService);
  private moduleService = inject(ModuleService);
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
        this.filteredMenu = this.buildMenu(user);
      } else {
        this.filteredMenu = this.menu;
      }
    });

    // Reconstruire le menu quand les modules changent (ex. après login)
    this.moduleService.modules$.subscribe(() => {
      const user = this.authService.getUser();
      if (user?.profil) {
        this.filteredMenu = this.buildMenu(user);
      }
    });

    // Sync collapsed/mobile-open state when toggled from the header button
    this.bodyObserver = new MutationObserver(() => {
      this.collapsed  = document.body.classList.contains('sidebar-collapsed');
      this.mobileOpen = document.body.classList.contains('sidebar-mobile-open');
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

  private buildMenu(user: any): any[] {
    const role = user.profil.code?.toLowerCase() || '';
    const byRole = this.filterMenuByRole(this.menu, role, user);
    // super_admin voit tout sans restriction de modules
    if (role === 'super_admin') return byRole;
    return this.filterMenuByModules(byRole);
  }

  private filterMenuByModules(menu: any[]): any[] {
    return menu
      .filter((section: any) => {
        // Section avec module → vérifier
        if (section.module) return this.moduleService.hasModule(section.module as ModuleCode);
        return true;
      })
      .map((section: any) => ({
        ...section,
        menu: (section.menu ?? []).filter((item: any) => {
          if (item.module) return this.moduleService.hasModule(item.module as ModuleCode);
          return true;
        }),
      }))
      .filter((section: any) => (section.menu?.length ?? 0) > 0 || !section.titre);
  }

  filterMenuByRole(menu: any[], role: string, user?: any): any[] {
    const filteredMenu = JSON.parse(JSON.stringify(menu));
    const peutFaireRetour: boolean = !!user?.peut_faire_retour;

    // Caissier / vendeur : menu POS uniquement, sauf permission retour
    if (role === 'caissier' || role === 'vendeur') {
      if (!peutFaireRetour) return [];
      // Seulement la section "Gestion des stocks" réduite à "Retours produits"
      return filteredMenu
        .filter((s: any) => s.titre === 'Gestion des stocks')
        .map((s: any) => ({
          ...s,
          menu: (s.menu ?? []).filter((item: any) => item.libelle === 'Retours produits'),
        }))
        .filter((s: any) => s.menu.length > 0);
    }

    // Masquer "Profil" du menu Utilisateurs pour tous les rôles sauf super_admin
    if (role !== 'super_admin') {
      filteredMenu.forEach((section: any) => {
        section.menu?.forEach((item: any) => {
          if (item.sousMenu) {
            item.sousMenu = item.sousMenu.filter((s: any) => s.libelle !== 'Profil');
          }
        });
      });
    }

    if (role === 'admin') return filteredMenu;

    if (role === 'responsable_structure') {
      filteredMenu.forEach((section: any) => {
        section.menu?.forEach((item: any) => {
          if (item.sousMenu) {
            item.sousMenu = item.sousMenu.filter((s: any) => s.libelle !== 'Structure');
          }
        });
      });
      return filteredMenu;
    }

    if (role === 'gerant' || role === 'user') {
      return filteredMenu
        .filter((section: any) => section.titre !== 'Paramétrages')
        .map((section: any) => {
          section.menu?.forEach((item: any) => {
            if (item.sousMenu) {
              item.sousMenu = item.sousMenu.filter((s: any) =>
                s.libelle !== 'Catégories' &&
                s.libelle !== 'Fournisseurs' &&
                s.libelle !== 'Structure' &&
                s.libelle !== 'Utilisateurs'
              );
            }
            if (item.libelle === 'Commandes fournisseurs') item._hidden = true;
            // Masquer "Retours produits" au gérant s'il n'a pas la permission
            if (item.libelle === 'Retours produits' && !peutFaireRetour) {
              item._hidden = true;
            }
          });
          section.menu = section.menu?.filter((item: any) =>
            !item._hidden && (!item.sousMenu || item.sousMenu.length > 0)
          );
          return section;
        })
        .filter((section: any) => section.menu?.length > 0);
    }

    return filteredMenu;
  }
}
