import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';
import { AlerteService } from '../../services/alerte/alerte.service';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LoaderService } from '../../services/loader/loader.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  currentUser: any | null = null;
  alerteCount = 0;
  commandesCount = 0;
  alertProduits: any[] = [];

  constructor(
    private authService: AuthService,
    private alerteService: AlerteService,
    private router: Router,
    private toastr: ToastrService,
    private loaderService: LoaderService,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });
    this.alerteService.count$.subscribe(n => this.alerteCount = n);
    this.alerteService.commandesCount$.subscribe(n => this.commandesCount = n);
    this.alerteService.alertProduits$.subscribe(p => this.alertProduits = p);
  }

  get tickerDuration(): string {
    return `${Math.max(15, this.alertProduits.length * 5)}s`;
  }

  toggleSidebar(): void {
    if (window.innerWidth < 992) {
      document.body.classList.toggle('sidebar-mobile-open');
    } else {
      document.body.classList.toggle('sidebar-collapsed');
    }
  }

  get structureNom(): string | null {
    return this.currentUser?.boutique?.structure?.nom
      || this.currentUser?.structure?.nom
      || this.currentUser?.structure?.[0]?.nom
      || null;
  }

  logout() {
    this.authService.logout();
    this.router.navigateByUrl('/login');
    this.loaderService.showLoading();
    setTimeout(() => {
      this.loaderService.hideLoading();
    }, 1500);
    setTimeout(() => {
      this.toastr.success('Vous êtes déconnecté!');
    }, 2000);
  }

}
