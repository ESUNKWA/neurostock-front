import { Component, HostBinding, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { Menu } from './menu';
import { AuthService } from '../../services/auth/auth.service';
import { ModuleService, ModuleCode } from '../../services/modules/module.service';
import { BoutiqueService } from '../../services/boutique/boutique.service';
import { hasEntrepot } from '../../helpers/boutique-type.util';

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
  private boutiqueService = inject(BoutiqueService);
  private bodyObserver?: MutationObserver;

  // Dérivé de la liste des boutiques de la structure : conditionne l'affichage
  // du menu "Transferts stock" (sans objet pour un petit commerce sans entrepôt).
  private structureHasEntrepot = false;

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
        this.loadStructureBoutiques(user);
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

  /** Charge les boutiques de la structure pour savoir si elle a un entrepôt, puis (re)construit le menu. */
  private loadStructureBoutiques(user: any): void {
    const code = this.currentUserProfile;
    const structureId = user?.structure_id ?? user?.structure?.id ?? user?.boutique?.structure_id;

    const onLoaded = (list: any[]) => {
      this.structureHasEntrepot = hasEntrepot(list);
      this.filteredMenu = this.buildMenu(user);
    };

    if (code === 'admin') {
      this.boutiqueService.find().subscribe({
        next: (r: any) => onLoaded(r?.data ?? []),
        error: () => onLoaded([]),
      });
    } else if (structureId) {
      this.boutiqueService.findByStructure(structureId).subscribe({
        next: (r: any) => onLoaded(r?.data ?? []),
        error: () => onLoaded([]),
      });
    } else {
      onLoaded(user?.boutique ? [user.boutique] : []);
    }
  }

  private buildMenu(user: any): any[] {
    const role = user.profil.code?.toLowerCase() || '';
    let byRole = this.filterMenuByRole(this.menu, role, user);
    if (!this.structureHasEntrepot) {
      byRole = this.hideTransfertsStock(byRole);
    }
    // super_admin voit tout sans restriction de modules
    if (role === 'super_admin') return byRole;
    return this.filterMenuByModules(byRole);
  }

  /** "Transferts stock" n'a de sens que pour une structure ayant au moins un entrepôt. */
  private hideTransfertsStock(menu: any[]): any[] {
    return menu
      .map((section: any) => ({
        ...section,
        menu: (section.menu ?? []).filter((item: any) => item.libelle !== 'Transferts stock'),
      }))
      .filter((section: any) => (section.menu?.length ?? 0) > 0 || !section.titre);
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
