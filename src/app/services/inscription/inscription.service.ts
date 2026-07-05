import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environnement } from '../../environnement/environnement';

export interface CreateInscriptionDto {
  structure_nom: string;
  structure_telephone?: string;
  structure_email?: string;
  structure_situation_geo?: string;
  boutique_nom: string;
  boutique_situation_geo?: string;
  responsable_nom: string;
  responsable_prenoms?: string;
  responsable_telephone?: string;
  responsable_email?: string;
  responsable_password: string;
}

export interface ValiderInscriptionDto {
  username: string;
  password: string;
  database: string;
  host?: string;
}

@Injectable({ providedIn: 'root' })
export class InscriptionService {
  private readonly API = environnement.API_URL;

  constructor(private http: HttpClient) {}

  soumettre(payload: CreateInscriptionDto): Observable<any> {
    return this.http.post(`${this.API}/inscription`, payload);
  }

  getAll(): Observable<any> {
    return this.http.get(`${this.API}/inscription`);
  }

  valider(id: number, creds: ValiderInscriptionDto): Observable<any> {
    return this.http.post(`${this.API}/inscription/${id}/valider`, creds);
  }

  rejeter(id: number, notes?: string): Observable<any> {
    return this.http.post(`${this.API}/inscription/${id}/rejeter`, { notes });
  }
}
