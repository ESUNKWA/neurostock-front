import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';
import { environnement } from '../../environnement/environnement';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class BoutiqueService {

  private readonly API_URL = environnement.API_URL;
  readonly http = inject(HttpClient);
  readonly boutiques: any = signal([]); // Typage correct du signal

  getDefaultStructure() {
    return this.http.get(`${this.API_URL}/structure`);
  }

  //récupère tous les boutiques
  find(id: string): Observable<any> {
    return this.http.get(`${this.API_URL}/boutique`)
      .pipe(
        tap(data => this.boutiques.set(data)),
        catchError(error => {
          console.error('Erreur lors du chargement des boutiques', error);
          return of([]); // Retourne un tableau vide en cas d'erreur
        })
      );
  }

  create(body: any): Observable<any>{
    return this.http.post(`${this.API_URL}/boutique`, body);
  }

  update(boutique: any, id: string): Observable<any>{
    return this.http.patch(`${this.API_URL}/boutique/${+id}`, boutique)
  }

  delete(id: string){
    return this.http.delete(`${this.API_URL}/boutique/${id}`);
  }
}
