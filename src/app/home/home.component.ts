import { Component, OnInit, inject } from '@angular/core';
import { HeaderComponent } from '../layout/header/header.component';
import { SidebarComponent } from '../layout/sidebar/sidebar.component';
import { FooterComponent } from '../layout/footer/footer.component';
import { RouterOutlet, Router } from '@angular/router';
import { AbonnementBannerComponent } from '../components/abonnement-banner/abonnement-banner.component';
import { AuthService } from '../services/auth/auth.service';

const POS_ROLES = ['caissier', 'vendeur'];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeaderComponent, SidebarComponent, FooterComponent, RouterOutlet, AbonnementBannerComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export default class HomeComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: any) => {
      if (!user) return;
      const code = user?.profil?.code?.toLowerCase() ?? '';
      if (POS_ROLES.includes(code)) {
        this.router.navigateByUrl('/pos/vente');
      }
    });
  }
}
