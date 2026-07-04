import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-pos-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './pos-layout.component.html',
  styleUrl: './pos-layout.component.scss',
})
export default class PosLayoutComponent implements OnInit {
  currentUser: any;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => (this.currentUser = u));
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

  get boutiqueName(): string {
    return this.currentUser?.boutique?.nom || '';
  }

  get profilLabel(): string {
    return this.currentUser?.profil?.libelle || this.currentUser?.profil?.code || '';
  }

  get peutFaireRetour(): boolean {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    if (code === 'admin' || code === 'responsable_structure') return true;
    return !!this.currentUser?.peut_faire_retour;
  }
}
