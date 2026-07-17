import { Injectable } from '@angular/core';
import { HttpClientService } from '../http-client/http-client.service';
import { environnement } from '../../environnement/environnement';

@Injectable({ providedIn: 'root' })
export class TransfertStockService {
  private readonly BASE = `${environnement.API_URL}/transfert-stock`;

  constructor(private http: HttpClientService) {}

  findAll(params: { boutique?: number; boutique_source?: number; boutique_destination?: number; page?: number; limit?: number }) {
    return this.http.get(this.BASE, { params });
  }

  findOne(id: number) {
    return this.http.getById(this.BASE, id);
  }

  create(dto: any) {
    return this.http.post(this.BASE, dto);
  }

  update(id: number, dto: any) {
    return this.http.patch(`${this.BASE}/${id}`, dto);
  }

  valider(id: number) {
    return this.http.patch(`${this.BASE}/${id}/valider`, {});
  }

  recevoir(id: number) {
    return this.http.patch(`${this.BASE}/${id}/recevoir`, {});
  }

  remove(id: number) {
    return this.http.delete(`${this.BASE}/${id}`);
  }

  rapprochement(boutiqueSourceId: number) {
    return this.http.get(`${this.BASE}/rapprochement`, { params: { source: boutiqueSourceId } });
  }

  rapportVentes(params: {
    boutique_destination: number;
    boutique_source?: number;
    date_debut?: string;
    date_fin?: string;
  }) {
    const p: any = { boutique_destination: params.boutique_destination };
    if (params.boutique_source) p.boutique_source = params.boutique_source;
    if (params.date_debut) p.date_debut = params.date_debut;
    if (params.date_fin) p.date_fin = params.date_fin;
    return this.http.get(`${this.BASE}/rapport-ventes`, { params: p });
  }
}
