import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  currentUser: any | null = null;
  constructor(
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
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
    this.toastr.success('Vous êtes déconnecté!');
  }

}
