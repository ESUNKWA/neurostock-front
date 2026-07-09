import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { DeviceService } from '../../services/device/device.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-pos-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './pos-layout.component.html',
  styleUrl: './pos-layout.component.scss',
})
export default class PosLayoutComponent implements OnInit, OnDestroy {
  currentUser: any;
  isMobile = false;
  userMenuOpen = false;
  posMenuOpen = false;

  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private deviceSvc: DeviceService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.authService.currentUser$.subscribe(u => (this.currentUser = u))
    );
    this.subs.push(
      this.deviceSvc.isMobile$.subscribe(m => this.isMobile = m)
    );
    this.subs.push(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
        this.posMenuOpen = false;
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

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
    const nom    = this.currentUser?.nom ?? '';
    const prenom = this.currentUser?.prenoms ?? this.currentUser?.prenom ?? '';
    if (prenom) return `${prenom[0]}${nom[0] ?? ''}`.toUpperCase();
    return nom.substring(0, 2).toUpperCase() || '?';
  }

  get boutiqueName(): string {
    return this.currentUser?.boutique?.nom || '';
  }

  get structureName(): string {
    return this.currentUser?.boutique?.structure?.nom
      || this.currentUser?.structure?.nom
      || this.currentUser?.structure?.[0]?.nom
      || this.boutiqueName;
  }

  get profilLabel(): string {
    return this.currentUser?.profil?.libelle || this.currentUser?.profil?.code || '';
  }

  onLogoError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  get peutFaireRetour(): boolean {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    if (code === 'admin' || code === 'responsable_structure') return true;
    return !!this.currentUser?.peut_faire_retour;
  }
}
