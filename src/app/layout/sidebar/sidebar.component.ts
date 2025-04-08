import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { Menu } from './menu';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {

  menu =  Menu;

  isActive = 'nav-link collapsed';

  private authService = inject(AuthService);

  constructor(private router: Router) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isActive = this.router.url === '/dashboard' ? 'nav-link' : 'nav-link collapsed';
      }
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: any) => {
      console.log('user', user);
    });
  }
  
}
