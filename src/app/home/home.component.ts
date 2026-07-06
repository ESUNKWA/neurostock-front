import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { HeaderComponent } from '../layout/header/header.component';
import { SidebarComponent } from '../layout/sidebar/sidebar.component';
import { FooterComponent } from '../layout/footer/footer.component';
import { RouterOutlet, Router } from '@angular/router';
import { AbonnementBannerComponent } from '../components/abonnement-banner/abonnement-banner.component';
import { AuthService } from '../services/auth/auth.service';
import { DeviceService } from '../services/device/device.service';
import { MobileNavComponent } from '../layout/mobile-nav/mobile-nav.component';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

const POS_ROLES = ['caissier', 'vendeur'];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    SidebarComponent,
    FooterComponent,
    AbonnementBannerComponent,
    MobileNavComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export default class HomeComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  readonly deviceSvc = inject(DeviceService);

  isMobile = false;
  currentUser: any = null;
  userMenuOpen = false;

  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.subs.push(
      this.deviceSvc.isMobile$.subscribe(m => this.isMobile = m)
    );
    this.subs.push(
      this.authService.currentUser$.subscribe((user: any) => {
        if (!user) return;
        this.currentUser = user;
        const code = user?.profil?.code?.toLowerCase() ?? '';
        if (POS_ROLES.includes(code)) {
          this.router.navigateByUrl('/pos/vente');
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  logout(): void {
    this.authService.logout();
  }

  onLogoError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/img/logo_neurostock_icone.png';
  }

  getUserInitials(): string {
    const nom    = this.currentUser?.nom ?? '';
    const prenom = this.currentUser?.prenom ?? this.currentUser?.prenoms ?? '';
    if (prenom) return `${prenom[0]}${nom[0] ?? ''}`.toUpperCase();
    return nom.substring(0, 2).toUpperCase() || '?';
  }
}
