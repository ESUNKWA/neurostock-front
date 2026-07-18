import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { CommandeTableService } from '../../services/restaurant/commande-table.service';
import { RestaurantSocketService } from '../../services/restaurant/restaurant-socket.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-restaurant-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './restaurant-layout.component.html',
  styleUrl: './restaurant-layout.component.scss',
})
export default class RestaurantLayoutComponent implements OnInit, OnDestroy {
  currentUser: any;
  sidebarOpen = false;
  userMenuOpen = false;
  pendingCount = 0;

  private subs = new Subscription();

  constructor(
    private authService: AuthService,
    private commandeService: CommandeTableService,
    private socket: RestaurantSocketService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.authService.currentUser$.subscribe(u => {
        this.currentUser = u;
        if (u?.boutique?.id) {
          this.loadPendingCount();
          this.socket.connect(u.boutique.id);
        }
      })
    );

    this.subs.add(
      this.socket.nouvelleCommande$.subscribe(cmd => {
        if (cmd.statut === 'en_attente') this.pendingCount++;
      })
    );

    this.subs.add(
      this.socket.statutChange$.subscribe(({ statut }) => {
        if (statut !== 'en_attente') this.loadPendingCount();
      })
    );

    this.subs.add(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd))
        .subscribe(() => { this.sidebarOpen = false; this.userMenuOpen = false; })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.socket.disconnect();
  }

  private loadPendingCount(): void {
    const bid = this.currentUser?.boutique?.id;
    if (!bid) return;
    this.commandeService.getAll(bid, 'en_attente').subscribe({
      next: (r: any) => { this.pendingCount = (r?.data ?? []).length; },
      error: () => {}
    });
  }

  goToGestion(): void {
    sessionStorage.setItem('force_gestion_mode', '1');
    this.router.navigateByUrl('/dashboard');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  get isMobileMode(): boolean {
    const ecran = this.authService.getEcranCible();
    return ecran === 'restaurant-serveur' || ecran === 'restaurant-cuisine';
  }

  get userName(): string {
    if (!this.currentUser) return '';
    return `${this.currentUser.prenoms || ''} ${this.currentUser.nom || ''}`.trim()
      || this.currentUser.telephone || '';
  }

  get userInitials(): string {
    const nom    = this.currentUser?.nom ?? '';
    const prenom = this.currentUser?.prenoms ?? '';
    if (prenom) return `${prenom[0]}${nom[0] ?? ''}`.toUpperCase();
    return nom.substring(0, 2).toUpperCase() || '?';
  }

  get boutiqueName(): string {
    return this.currentUser?.boutique?.nom || 'Restaurant';
  }

  get profilLabel(): string {
    return this.currentUser?.profil?.libelle || this.currentUser?.profil?.code || '';
  }

  get isAdmin(): boolean {
    const c = this.currentUser?.profil?.code?.toLowerCase();
    return c === 'admin' || c === 'responsable_structure' || c === 'gerant';
  }

  onLogoError(e: Event): void {
    (e.target as HTMLImageElement).style.display = 'none';
  }
}
