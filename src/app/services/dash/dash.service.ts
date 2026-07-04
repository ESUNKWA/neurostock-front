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

}
