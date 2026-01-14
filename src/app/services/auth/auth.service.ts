import { Injectable } from '@angular/core';
import { HttpClientService } from '../http-client/http-client.service';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environnement } from '../../environnement/environnement';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environnement.API_URL;
  private currentUserSubject = new BehaviorSubject<any | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClientService,
    private router: Router
  ) {
    // Vérifier si un utilisateur est déjà connecté au démarrage
    const user = localStorage.getItem('user');
    if (user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  login(credentials: { email: string; mot_de_passe: string }) {
    return this.http.post(`${this.API_URL}/authentication`, credentials)
      .pipe(
        tap((response: any) => {
          // Stocker le token
          localStorage.setItem('access_token', response.access_token);
          // Stocker les informations de l'utilisateur
          localStorage.setItem('user', JSON.stringify(response.utilisateur));
          this.currentUserSubject.next(response.utilisateur);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigateByUrl('/login');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getUser(): any | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
}
