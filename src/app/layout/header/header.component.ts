import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';
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
  constructor(
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private loaderService: LoaderService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });
  }

  toggleSidebar() {
    const sidebar = document.getElementById('toggleSidebar');
    if (sidebar) {
      sidebar.classList.toggle('toggle-sidebar');
    }
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
