import { Injectable } from '@angular/core';
import { HttpClientService } from '../http-client/http-client.service';
import { environnement } from '../../environnement/environnement';

@Injectable({ providedIn: 'root' })
export class TableRestaurantService {
  private readonly BASE = `${environnement.API_URL}/restaurant/tables`;

  constructor(private http: HttpClientService) {}

  getAll(boutiqueId: number) {
    return this.http.get(this.BASE, { params: { boutique: boutiqueId } });
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

  changerStatut(id: number, statut: string) {
    return this.http.patch(`${this.BASE}/${id}/statut`, { statut });
  }

  acquitterAppel(tableId: number) {
    return this.http.patch(`${this.BASE}/${tableId}/acquitter-appel`, {});
  }

  remove(id: number) {
    return this.http.delete(`${this.BASE}/${id}`);
  }
}
