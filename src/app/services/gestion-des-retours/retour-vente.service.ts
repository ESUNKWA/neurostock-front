import { Injectable } from '@angular/core';
import { HttpClientService } from '../http-client/http-client.service';
import { environnement } from '../../environnement/environnement';

@Injectable({ providedIn: 'root' })
export class RetourVenteService {
  private readonly base = `${environnement.API_URL}/retour-vente`;

  constructor(private http: HttpClientService) {}

  create(body: {
    vente_id: number;
    boutique: number;
    motif?: string;
    user?: string;
    details: { produit_id: number; quantite_retournee: number }[];
  }) {
    return this.http.post(this.base, body);
  }

  getAll(params: { boutique?: number; reference?: string; date_debut?: string; date_fin?: string; montant?: number; page?: number; limit?: number }) {
    return this.http.get(this.base, { params: params as any });
  }

  getByVente(venteId: number) {
    return this.http.get(`${this.base}/vente/${venteId}`);
  }

  getOne(id: number) {
    return this.http.get(`${this.base}/${id}`);
  }

  annuler(id: number) {
    return this.http.patch(`${this.base}/${id}/annuler`, {});
  }
}
