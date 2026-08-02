import { Injectable } from '@angular/core';
import { environnement } from '../../environnement/environnement';
import { HttpClientService } from '../http-client/http-client.service';

export interface VenteParams {
  boutique: number;
  date_debut?: string;
  date_fin?: string;
  utilisateur?: number | null;
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

  saveComptage(body: any) {
    return this.http.post(`${this.API_URL}/vente/comptage`, body);
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

  regulariser(id: number, body: { mode_paiement: string; montant_recu: number; details_paiement: any }) {
    return this.http.patch(`${this.API_URL}/vente/${id}/regulariser`, body);
  }

  envoyerRecuWhatsapp(id: number, documentUrl?: string) {
    const body = documentUrl
      ? { documentUrl, nomFichier: `Reçu_vente_${id}.pdf` }
      : {};
    return this.http.post(`${this.API_URL}/vente/${id}/whatsapp-recu`, body);
  }
}
