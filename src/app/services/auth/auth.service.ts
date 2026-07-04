import { Injectable } from '@angular/core';
import { HttpClientService } from '../http-client/http-client.service';
import { BehaviorSubject, catchError, map, of, switchMap, tap } from 'rxjs';
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
    const user = localStorage.getItem('user');
    if (user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  login(credentials: { telephone: string; mot_de_passe: string }) {
    return this.http.post(`${this.API_URL}/authentication`, credentials).pipe(
      tap((response: any) => {
        localStorage.setItem('access_token', response.access_token);
        if (response.abonnement) {
          localStorage.setItem('abonnement', JSON.stringify(response.abonnement));
        }
      }),
      switchMap((response: any) => {
        const baseUser = response.utilisateur;
        
        // Utilisateur sans tenant (super admin) → stocker directement
        if (!baseUser?.structure_id) {
          localStorage.setItem('user', JSON.stringify(baseUser));
          this.currentUserSubject.next(baseUser);
          return of(response);
        }

        // Utilisateur tenant → récupérer le profil complet depuis la BD tenant
        // On cherche par téléphone (identifiant commun aux deux BDs) car les ID
        // auto-incrementés master ≠ ID auto-incrementés tenant
        return this.http.get(`${this.API_URL}/utilisateur?telephone=${encodeURIComponent(baseUser.telephone)}`).pipe(
          map((r: any) => {
            const list = r?.data ?? r;
            const tenantUser = Array.isArray(list) ? list[0] : list;
            if (!tenantUser) throw new Error('not found');
            // Fusionner : les données tenant (boutique, boutique_id, boutiques…) enrichissent les données master
            const fullUser = { ...baseUser, ...tenantUser };
            localStorage.setItem('user', JSON.stringify(fullUser));
            this.currentUserSubject.next(fullUser);
            return response;
          }),
          catchError(() => {
            // Fallback si le GET tenant échoue : utiliser les données master de base
            localStorage.setItem('user', JSON.stringify(baseUser));
            this.currentUserSubject.next(baseUser);
            return of(response);
          })
        );
      })
    );
  }

  /**
   * Recharge le profil depuis la BD tenant et met à jour localStorage + BehaviorSubject.
   * À appeler après une modification du profil utilisateur.
   */
  refreshCurrentUser(): void {
    const user = this.getUser();
    if (!user?.telephone || !user?.structure_id) return;

    this.http.get(`${this.API_URL}/utilisateur?telephone=${encodeURIComponent(user.telephone)}`).subscribe({
      next: (r: any) => {
        const list = r?.data ?? r;
        const tenantUser = Array.isArray(list) ? list[0] : list;
        if (!tenantUser) return;
        const fullUser = { ...user, ...tenantUser };
        localStorage.setItem('user', JSON.stringify(fullUser));
        this.currentUserSubject.next(fullUser);
      }
    });
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('abonnement');
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

  getAbonnement(): any | null {
    const a = localStorage.getItem('abonnement');
    return a ? JSON.parse(a) : null;
  }
}
