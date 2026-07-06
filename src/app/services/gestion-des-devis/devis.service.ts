import { Injectable } from '@angular/core';
import { HttpClientService } from '../http-client/http-client.service';
import { environnement } from '../../environnement/environnement';

export interface DevisParams {
  boutique: number;
  date_debut?: string;
  date_fin?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class DevisService {
  private readonly API_URL = environnement.API_URL;

  constructor(private http: HttpClientService) {}

  getAllDevis(params: DevisParams) {
    return this.http.get(`${this.API_URL}/devis`, { params });
  }

  getDetailDevis(id: any) {
    return this.http.get(`${this.API_URL}/devis/${id}`);
  }

  saveDevis(body: any) {
    return this.http.post(`${this.API_URL}/devis`, body);
  }

  updateDevis(id: any, body: any) {
    return this.http.patch(`${this.API_URL}/devis/${id}`, body);
  }

  deleteDevis(id: any) {
    return this.http.delete(`${this.API_URL}/devis/${id}`);
  }

  changerStatut(id: any, statut: string) {
    return this.http.patch(`${this.API_URL}/devis/${id}/statut`, { statut });
  }

  convertirEnVente(id: any) {
    return this.http.post(`${this.API_URL}/devis/${id}/convertir-en-vente`, {});
  }

  imprimerDevis(id: any) {
    return this.http.get(`${this.API_URL}/pdf/generate/devis/${id}`);
  }
}
