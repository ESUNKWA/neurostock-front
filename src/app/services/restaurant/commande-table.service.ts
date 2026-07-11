import { Injectable } from '@angular/core';
import { HttpClientService } from '../http-client/http-client.service';
import { environnement } from '../../environnement/environnement';

@Injectable({ providedIn: 'root' })
export class CommandeTableService {
  private readonly BASE = `${environnement.API_URL}/restaurant/commandes`;

  constructor(private http: HttpClientService) {}

  getAll(boutiqueId: number, statut?: string) {
    const params: any = { boutique: boutiqueId };
    if (statut) params.statut = statut;
    return this.http.get(this.BASE, { params });
  }

  getById(id: number) {
    return this.http.get(`${this.BASE}/${id}`);
  }

  create(dto: any) {
    return this.http.post(this.BASE, dto);
  }

  ajouterLignes(id: number, lignes: any[]) {
    return this.http.post(`${this.BASE}/${id}/lignes`, { lignes });
  }

  changerStatut(id: number, statut: string) {
    return this.http.patch(`${this.BASE}/${id}/statut`, { statut });
  }

  encaisser(id: number, libererTable: boolean) {
    return this.http.post(`${this.BASE}/${id}/encaisser`, { liberer_table: libererTable });
  }

  remove(id: number) {
    return this.http.delete(`${this.BASE}/${id}`);
  }
}
