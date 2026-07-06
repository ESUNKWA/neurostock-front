import { Injectable } from '@angular/core';
import { environnement } from '../../environnement/environnement';
import { HttpClientService } from '../http-client/http-client.service';

export interface VenteParams {
  boutique: number;
  date_debut?: string;
  date_fin?: string;
}

@Injectable({ providedIn: 'root' })
export class VentesService {
  private readonly API_URL = environnement.API_URL;

  constructor(private http: HttpClientService) {}

  getAllVentes(params: VenteParams) {
    return this.http.get(`${this.API_URL}/vente`, { params });
  }

  getDetailVente(id: any) {
    return this.http.get(`${this.API_URL}/vente/${id}`);
  }

  saveVente(body: any) {
    return this.http.post(`${this.API_URL}/vente`, body);
  }

  updateVente(id: any, body: any) {
    return this.http.patch(`${this.API_URL}/vente/${id}`, body);
  }

  deleteVente(id: any) {
    return this.http.delete(`${this.API_URL}/vente/${id}`);
  }

  imprimerRecu(idVente: any) {
    return this.http.get(`${this.API_URL}/pdf/generate/facture/${idVente}`);
  }

  imprimerThermique(idVente: any) {
    return this.http.get(`${this.API_URL}/pdf/generate/facture/${idVente}/thermique`);
  }
}
