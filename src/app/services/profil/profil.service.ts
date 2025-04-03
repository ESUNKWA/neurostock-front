import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';
import { environnement } from '../../environnement/environnement';

@Injectable({
  providedIn: 'root'
})
export class ProfilService {

  private readonly API_URL = environnement.API_URL;
  readonly http = inject(HttpClient);
  readonly profils: any = signal([]); // Typage correct du signal

  find(): Observable<any> {
    return this.http.get(`${this.API_URL}/profil`)
      .pipe(
        tap(profils => this.profils.set(profils)),
        catchError(error => {
          console.error('Erreur lors du chargement des profils', error);
          return of([]); // Retourne un tableau vide en cas d'erreur
        })
      );
  }
 
}


