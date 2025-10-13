import { inject, Injectable, signal } from '@angular/core';
import { environnement } from '../../environnement/environnement';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StructureService {

  private readonly API_URL = environnement.API_URL;
  readonly http = inject(HttpClient);
  readonly structures: any = signal([]); // Typage correct du signal

  //récupère tous les structures
  find(): Observable<any> {
    return this.http.get(`${this.API_URL}/structure`)
      .pipe(
        tap(data => this.structures.set(data)),
        catchError(error => {
          console.error('Erreur lors du chargement des structures', error);
          return of([]); // Retourne un tableau vide en cas d'erreur
        })
      );
  }

  create(body: any): Observable<any>{
    return this.http.post(`${this.API_URL}/structure`, body);
  }

  update(structure: any, id: string): Observable<any>{
    return this.http.patch(`${this.API_URL}/structure/${+id}`, structure)
  }

  delete(id: string){
    return this.http.delete(`${this.API_URL}/structure/${id}`);
  }
}
