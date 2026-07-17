import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environnement } from '../../environnement/environnement';

@Injectable({ providedIn: 'root' })
export class PublicMenuService {
  private readonly BASE = `${environnement.API_URL}/public`;

  constructor(private http: HttpClient) {}

  getMenu(boutiqueId: number, structureId: number) {
    return this.http.get<any>(`${this.BASE}/menu`, { params: { boutique: boutiqueId, structure: structureId } });
  }

  passerCommande(dto: {
    boutique: number;
    structure: number;
    telephone: string;
    table?: number;
    lignes: { recette: number; quantite: number; prix_unitaire: number; note?: string }[];
  }) {
    return this.http.post<any>(`${this.BASE}/commande`, dto);
  }

  appelServeur(boutiqueId: number, structureId: number, tableId?: number) {
    return this.http.post<any>(`${this.BASE}/appel-serveur`, { boutique: boutiqueId, structure: structureId, table: tableId });
  }
}
