import { inject, Injectable, signal } from '@angular/core';
import { environnement } from '../../environnement/environnement';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashService {

  private readonly API_URL = environnement.API_URL;
  readonly http = inject(HttpClient);
  readonly profils: any = signal([]); // Typage correct du signal

  //récupère tous les profils
  find(boutiqueId: number): Observable<any> {
    return this.http.get(`${this.API_URL}/dashboard?boutique=${boutiqueId}`)
      .pipe(
        tap(data => this.profils.set(data)),
        catchError(error => {
          console.error('Erreur lors du chargement', error);
          return of(null);
        })
      );
  }

  findCaissier(boutiqueId: number, caissier: number | string): Observable<any> {
    return this.http.get(`${this.API_URL}/dashboard/caissier?boutique=${boutiqueId}&caissier=${caissier}`);
  }

  getRecette(params: { boutique: number; date_debut?: string; date_fin?: string; page?: number; limit?: number }): Observable<any> {
    const q = new URLSearchParams({ boutique: String(params.boutique) });
    if (params.date_debut) q.set('date_debut', params.date_debut);
    if (params.date_fin)   q.set('date_fin',   params.date_fin);
    if (params.page)       q.set('page',        String(params.page));
    if (params.limit)      q.set('limit',       String(params.limit));
    return this.http.get(`${this.API_URL}/dashboard/recette?${q.toString()}`);
  }

}
