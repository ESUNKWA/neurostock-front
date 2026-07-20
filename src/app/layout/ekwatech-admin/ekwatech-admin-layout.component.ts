import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';
import { InscriptionService } from '../../services/inscription/inscription.service';

@Component({
  selector: 'app-ekwatech-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './ekwatech-admin-layout.component.html',
  styleUrl: './ekwatech-admin-layout.component.scss',
})
export default class EkwatechAdminLayoutComponent implements OnInit {
  currentUser: any;
  sidebarOpen = false;
  inscriptionsEnAttente = 0;

  // Accordéon sidebar
  openGroups = new Set<string>();

  private readonly groupRoutes: Record<string, string[]> = {
    organisations: ['/ekwatech/structures', '/ekwatech/boutiques'],
    acces:         ['/ekwatech/utilisateurs', '/ekwatech/profils', '/ekwatech/configurations-ecran'],
    abonnements:   ['/ekwatech/inscriptions', '/ekwatech/abonnements', '/ekwatech/plans', '/ekwatech/frais-setup', '/ekwatech/categories'],
    infra:         ['/ekwatech/tenants', '/ekwatech/provision', '/ekwatech/storage', '/ekwatech/modules'],
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private inscriptionSvc: InscriptionService,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => (this.currentUser = u));
    this.openActiveGroup();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.sidebarOpen = false;
      this.openActiveGroup();
      this.loadInscriptionsCount();
    });
    this.loadInscriptionsCount();
  }

  toggleGroup(g: string): void {
    if (this.openGroups.has(g)) {
      this.openGroups.clear();
    } else {
      this.openGroups.clear();
      this.openGroups.add(g);
    }
  }

  isGroupOpen(g: string): boolean { return this.openGroups.has(g); }

  private openActiveGroup(): void {
    const url = this.router.url;
    for (const [g, routes] of Object.entries(this.groupRoutes)) {
      if (routes.some(r => url.startsWith(r))) {
        this.openGroups.add(g);
        return;
      }
    }
  }

  private loadInscriptionsCount(): void {
    this.inscriptionSvc.getAll().subscribe({
      next: (r: any) => {
        const list: any[] = r?.data ?? (Array.isArray(r) ? r : []);
        this.inscriptionsEnAttente = list.filter(i => i.statut === 'en_attente').length;
      },
      error: () => { this.inscriptionsEnAttente = 0; },
    });
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  get userName(): string {
    if (!this.currentUser) return '';
    return `${this.currentUser.prenoms || ''} ${this.currentUser.nom || ''}`.trim()
      || this.currentUser.telephone || '';
  }

  get userInitials(): string {
    const parts = this.userName.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0]?.[0] || 'A').toUpperCase();
  }
}
