import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';
import { environnement } from '../../environnement/environnement';

export interface Profil {
  nom: string;
  description: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProfilService {
  
  private readonly API_URL = environnement.API_URL;
  readonly http = inject(HttpClient);
  readonly profils: any = signal<Profil[]>([]); // Typage correct du signal

  //récupère tous les profils
  find(): Observable<any> {
    return this.http.get(`${this.API_URL}/profil`)
      .pipe(
        tap(data => this.profils.set(data)),
        catchError(error => {
          console.error('Erreur lors du chargement des profils', error);
          return of([]); // Retourne un tableau vide en cas d'erreur
        })
      );
  }

  create(body: any): Observable<any>{
    return this.http.post(`${this.API_URL}/profil`, body);
  }

  update(profil: any, id: string): Observable<any>{
    return this.http.patch(`${this.API_URL}/profil/${+id}`, profil)
  }

  delete(id: string){
    return this.http.delete(`${this.API_URL}/profil/${id}`);
  }
 
}


