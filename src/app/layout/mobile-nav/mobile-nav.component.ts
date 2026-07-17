import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, Subscription } from 'rxjs';
import { ModuleService, ModuleCode } from '../../services/modules/module.service';

interface NavModule { label: string; icon: string; lien: string; color: string; bg: string; module?: ModuleCode; }

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './mobile-nav.component.html',
  styleUrl: './mobile-nav.component.scss'
})
export class MobileNavComponent implements OnInit, OnDestroy {
  menuOpen = false;
  private router = inject(Router);
  private moduleService = inject(ModuleService);
  private sub!: Subscription;

  private readonly ALL_MODULES: NavModule[] = [
    { label: 'Ventes',          icon: 'bi-receipt',           lien: '/gestion-des-ventes/historique-ventes',             color: '#059669', bg: '#d1fae5' },
    { label: 'Produits',        icon: 'bi-box-seam',          lien: '/gestion-des-produits/produit',                     color: '#8b5cf6', bg: '#ede9fe' },
    { label: 'Appro.',          icon: 'bi-cart4',             lien: '/gestion-des-approvisionnements/approvisionnement', color: '#d97706', bg: '#fef3c7' },
    { label: 'Caisse',          icon: 'bi-cash-coin',         lien: '/caisse',                                           color: '#0369a1', bg: '#e0f2fe', module: 'caisse' },
    { label: 'Clients',         icon: 'bi-people',            lien: '/clients/list',                                     color: '#0891b2', bg: '#cffafe', module: 'clients' },
    { label: 'Devis',           icon: 'bi-file-earmark-text', lien: '/gestion-des-devis/historique',                     color: '#4f46e5', bg: '#e0e7ff', module: 'devis' },
    { label: 'Commandes',       icon: 'bi-bag-check',         lien: '/commandes-clients/liste',                          color: '#db2777', bg: '#fce7f3', module: 'commandes_clients' },
    { label: 'Retours',         icon: 'bi-arrow-return-left', lien: '/retours/historique',                               color: '#dc2626', bg: '#fee2e2', module: 'retours_produits' },
    { label: 'Transferts',      icon: 'bi-boxes',             lien: '/stocks/transferts',                                color: '#0f766e', bg: '#ccfbf1' },
    { label: 'Rapp. transf.',   icon: 'bi-bar-chart-line',    lien: '/stocks/rapport-transferts',                        color: '#0f766e', bg: '#d1fae5' },
    { label: 'Recette',         icon: 'bi-cash-stack',        lien: '/recette',                                          color: '#0d9488', bg: '#ccfbf1' },
    { label: 'Analyse IA',      icon: 'bi-stars',             lien: '/analyse-ia/resume-journalier',                     color: '#7c3aed', bg: '#ede9fe', module: 'ia' },
    { label: 'Fournisseurs',    icon: 'bi-truck',             lien: '/gestion-des-produits/fournisseur',                 color: '#b45309', bg: '#fef3c7', module: 'fournisseurs' },
    { label: 'Utilisateurs',    icon: 'bi-person-workspace',  lien: '/utilisateurs/list',                                color: '#374151', bg: '#f9fafb' },
  ];

  modules: NavModule[] = [];
  hasCaisse = false;

  ngOnInit(): void {
    this.sub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => { this.menuOpen = false; });

    this.moduleService.modules$.subscribe(() => {
      this.hasCaisse = this.moduleService.hasModule('caisse');
      this.modules = this.ALL_MODULES.filter(m => !m.module || this.moduleService.hasModule(m.module));
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu(): void { this.menuOpen = false; }
}
