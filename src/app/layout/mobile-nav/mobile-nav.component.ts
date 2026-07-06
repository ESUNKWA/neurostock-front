import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, Subscription } from 'rxjs';

interface NavModule { label: string; icon: string; lien: string; color: string; bg: string; }

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
  private sub!: Subscription;

  readonly modules: NavModule[] = [
    { label: 'Ventes',          icon: 'bi-receipt',           lien: '/gestion-des-ventes/historique-ventes',                  color: '#059669', bg: '#d1fae5' },
    { label: 'Produits',        icon: 'bi-box-seam',          lien: '/gestion-des-produits/produit',                          color: '#8b5cf6', bg: '#ede9fe' },
    { label: 'Appro.',          icon: 'bi-cart4',             lien: '/gestion-des-approvisionnements/approvisionnement',      color: '#d97706', bg: '#fef3c7' },
    { label: 'Caisse',          icon: 'bi-cash-coin',         lien: '/caisse',                                                color: '#0369a1', bg: '#e0f2fe' },
    { label: 'Clients',         icon: 'bi-people',            lien: '/clients/list',                                          color: '#0891b2', bg: '#cffafe' },
    { label: 'Catégories',      icon: 'bi-tags',              lien: '/gestion-des-produits/categorie',                        color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Devis',           icon: 'bi-file-earmark-text', lien: '/gestion-des-devis/historique',                          color: '#4f46e5', bg: '#e0e7ff' },
    { label: 'Commandes',       icon: 'bi-bag-check',         lien: '/commandes-clients/liste',                               color: '#db2777', bg: '#fce7f3' },
    { label: 'Retours',         icon: 'bi-arrow-return-left', lien: '/retours/historique',                                    color: '#dc2626', bg: '#fee2e2' },
    { label: 'Mouvements',      icon: 'bi-arrow-left-right',  lien: '/stocks/mouvements',                                     color: '#374151', bg: '#f3f4f6' },
    { label: 'Recette',         icon: 'bi-cash-stack',        lien: '/recette',                                               color: '#0d9488', bg: '#ccfbf1' },
    { label: 'Analyse IA',      icon: 'bi-stars',             lien: '/analyse-ia/resume-journalier',                          color: '#7c3aed', bg: '#ede9fe' },
    { label: 'Fournisseurs',    icon: 'bi-truck',             lien: '/gestion-des-produits/fournisseur',                      color: '#b45309', bg: '#fef3c7' },
    { label: 'Utilisateurs',    icon: 'bi-person-workspace',  lien: '/utilisateurs/list',                                     color: '#374151', bg: '#f9fafb' },
  ];

  ngOnInit(): void {
    this.sub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => { this.menuOpen = false; });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu(): void { this.menuOpen = false; }
}
