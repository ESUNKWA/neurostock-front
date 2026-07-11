import { Injectable } from '@angular/core';
import { HttpClientService } from '../http-client/http-client.service';
import { environnement } from '../../environnement/environnement';

@Injectable({ providedIn: 'root' })
export class RecetteService {
  private readonly BASE = `${environnement.API_URL}/restaurant/recettes`;

  constructor(private http: HttpClientService) {}

  getAll(boutiqueId: number, categorie?: string) {
    const params: any = { boutique: boutiqueId };
    if (categorie) params.categorie = categorie;
    return this.http.get(this.BASE, { params });
  }

  getById(id: number) {
    return this.http.get(`${this.BASE}/${id}`);
  }

  create(dto: any) {
    return this.http.post(this.BASE, dto);
  }

  update(id: number, dto: any) {
    return this.http.patch(`${this.BASE}/${id}`, dto);
  }

  importDepuisStock(boutiqueId: number, items: { produit_id: number; nom: string; prix_vente: number; categorie: string }[]) {
    return this.http.post(`${this.BASE}/import-stock`, { boutique: boutiqueId, items });
  }

  remove(id: number) {
    return this.http.delete(`${this.BASE}/${id}`);
  }
}
