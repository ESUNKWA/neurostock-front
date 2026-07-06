import { Injectable } from '@angular/core';
import { HttpClientService } from '../http-client/http-client.service';
import { environnement } from '../../environnement/environnement';

export interface CommandeParams {
  boutique: number;
  date_debut?: string;
  date_fin?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class CommandeClientService {
  private readonly BASE = `${environnement.API_URL}/commande-client`;

  constructor(private http: HttpClientService) {}

  getAll(params: CommandeParams) {
    return this.http.get(this.BASE, { params });
  }

  getById(id: number) {
    return this.http.get(`${this.BASE}/${id}`);
  }

  create(body: any) {
    return this.http.post(this.BASE, body);
  }

  update(id: number, body: any) {
    return this.http.patch(`${this.BASE}/${id}`, body);
  }

  changerStatut(id: number, statut: string) {
    return this.http.patch(`${this.BASE}/${id}/statut`, { statut });
  }

  livrer(id: number) {
    return this.http.post(`${this.BASE}/${id}/livrer`, {});
  }

  remove(id: number) {
    return this.http.delete(`${this.BASE}/${id}`);
  }
}
