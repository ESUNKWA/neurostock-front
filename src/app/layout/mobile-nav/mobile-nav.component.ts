import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, Subscription } from 'rxjs';
import { ModuleService, ModuleCode } from '../../services/modules/module.service';
import { AuthService } from '../../services/auth/auth.service';
import { BoutiqueService } from '../../services/boutique/boutique.service';
import { hasEntrepot } from '../../helpers/boutique-type.util';

interface NavModule { label: string; icon: string; lien: string; color: string; bg: string; module?: ModuleCode; alwaysVisibleFor?: string[]; }

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './mobile-nav.component.html',
  styleUrl: './mobile-nav.component.scss'
})
export class MobileNavComponent implements OnInit, OnDestroy {
  menuOpen = false;
  isResponsableStructure = false;
  private role = '';

  private router = inject(Router);
  private moduleService = inject(ModuleService);
  private authService = inject(AuthService);
  private boutiqueService = inject(BoutiqueService);
  private navSub!: Subscription;
  private userSub!: Subscription;
  private modulesSub!: Subscription;

  // Cf. sidebar.component.ts : "Transferts"/"Rapp. transf." n'ont de sens que pour
  // une structure ayant au moins un entrepôt.
  private structureHasEntrepot = false;

  private readonly ALL_MODULES: NavModule[] = [
    { label: 'Points de vente', icon: 'bi-shop',             lien: '/structure/boutiques',                              color: '#c2410c', bg: '#ffedd5' },
    { label: 'Ventes',          icon: 'bi-receipt',           lien: '/gestion-des-ventes/historique-ventes',             color: '#059669', bg: '#d1fae5' },
    { label: 'Produits',        icon: 'bi-box-seam',          lien: '/gestion-des-produits/produit',                     color: '#8b5cf6', bg: '#ede9fe' },
    { label: 'Appro.',          icon: 'bi-cart4',             lien: '/gestion-des-approvisionnements/historique-approvisionnements', color: '#d97706', bg: '#fef3c7' },
    { label: 'Caisse',          icon: 'bi-cash-coin',         lien: '/caisse',                                           color: '#0369a1', bg: '#e0f2fe', module: 'caisse' },
    { label: 'Clients',         icon: 'bi-people',            lien: '/clients/list',                                     color: '#0891b2', bg: '#cffafe', module: 'clients' },
    { label: 'Devis',           icon: 'bi-file-earmark-text', lien: '/gestion-des-devis/historique',                     color: '#4f46e5', bg: '#e0e7ff', module: 'devis' },
    { label: 'Commandes',       icon: 'bi-bag-check',         lien: '/commandes-clients/liste',                          color: '#db2777', bg: '#fce7f3', module: 'commandes_clients' },
    { label: 'Retours',         icon: 'bi-arrow-return-left', lien: '/retours/historique',                               color: '#dc2626', bg: '#fee2e2', module: 'retours_produits' },
    { label: 'Transferts',      icon: 'bi-boxes',             lien: '/stocks/transferts',                                color: '#0f766e', bg: '#ccfbf1' },
    { label: 'Rapp. transf.',   icon: 'bi-bar-chart-line',    lien: '/stocks/rapport-transferts',                        color: '#0f766e', bg: '#d1fae5' },
    { label: 'Recette',         icon: 'bi-cash-stack',        lien: '/recette',                                          color: '#0d9488', bg: '#ccfbf1' },
    { label: 'Analyse IA',      icon: 'bi-stars',             lien: '/analyse-ia/resume-journalier',                     color: '#7c3aed', bg: '#ede9fe', module: 'ia' },
    { label: 'Fournisseurs',    icon: 'bi-truck',             lien: '/gestion-des-produits/fournisseur',                 color: '#b45309', bg: '#fef3c7', module: 'fournisseurs', alwaysVisibleFor: ['responsable_structure'] },
    { label: 'Utilisateurs',    icon: 'bi-person-workspace',  lien: '/utilisateurs/list',                                color: '#374151', bg: '#f9fafb' },
    { label: 'Abonnement',      icon: 'bi-calendar-check',    lien: '/mon-abonnement',                                   color: '#0369a1', bg: '#e0f2fe' },
  ];

  // Pour le responsable de structure : pilotage multi-boutiques et équipe en premier,
  // tâches opérationnelles du quotidien ensuite. Les autres rôles gardent l'ordre par défaut.
  private readonly PRIORITE_RESPONSABLE_STRUCTURE = [
    'Points de vente', 'Ventes', 'Recette', 'Utilisateurs', 'Abonnement',
    'Appro.', 'Fournisseurs', 'Produits', 'Clients', 'Devis', 'Commandes', 'Caisse',
    'Transferts', 'Rapp. transf.', 'Retours', 'Analyse IA',
  ];

  modules: NavModule[] = [];
  hasCaisse = false;

  ngOnInit(): void {
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => { this.menuOpen = false; });

    this.userSub = this.authService.currentUser$.subscribe((user: any) => {
      this.role = user?.profil?.code?.toLowerCase() ?? '';
      this.isResponsableStructure = this.role === 'responsable_structure';
      this.loadStructureBoutiques(user);
      this.rebuildModules();
    });

    this.modulesSub = this.moduleService.modules$.subscribe(() => {
      this.hasCaisse = this.moduleService.hasModule('caisse');
      this.rebuildModules();
    });
  }

  private loadStructureBoutiques(user: any): void {
    const code = this.role;
    const structureId = user?.structure_id ?? user?.structure?.id ?? user?.boutique?.structure_id;

    const onLoaded = (list: any[]) => {
      this.structureHasEntrepot = hasEntrepot(list);
      this.rebuildModules();
    };

    if (code === 'admin') {
      this.boutiqueService.find().subscribe({ next: (r: any) => onLoaded(r?.data ?? []), error: () => onLoaded([]) });
    } else if (structureId) {
      this.boutiqueService.findByStructure(structureId).subscribe({ next: (r: any) => onLoaded(r?.data ?? []), error: () => onLoaded([]) });
    } else {
      onLoaded(user?.boutique ? [user.boutique] : []);
    }
  }

  private rebuildModules(): void {
    const disponibles = this.ALL_MODULES
      .filter(m => !m.module || this.moduleService.hasModule(m.module) || m.alwaysVisibleFor?.includes(this.role))
      .filter(m => this.structureHasEntrepot || (m.label !== 'Transferts' && m.label !== 'Rapp. transf.'));

    if (!this.isResponsableStructure) {
      this.modules = disponibles;
      return;
    }

    const ordre = this.PRIORITE_RESPONSABLE_STRUCTURE;
    this.modules = [...disponibles].sort(
      (a, b) => ordre.indexOf(a.label) - ordre.indexOf(b.label)
    );
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.modulesSub?.unsubscribe();
  }

  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu(): void { this.menuOpen = false; }
}
