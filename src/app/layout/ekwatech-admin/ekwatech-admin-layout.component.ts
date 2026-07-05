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

  constructor(
    private authService: AuthService,
    private router: Router,
    private inscriptionSvc: InscriptionService,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => (this.currentUser = u));
    this.router.events.subscribe(() => { this.sidebarOpen = false; });
    this.loadInscriptionsCount();
    // Rafraîchit le compteur à chaque navigation (ex: après validation)
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.loadInscriptionsCount();
    });
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
