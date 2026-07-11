import { Injectable } from '@angular/core';
import { HttpClientService } from '../http-client/http-client.service';
import { environnement } from '../../environnement/environnement';

@Injectable({ providedIn: 'root' })
export class MenuJourService {
  private readonly BASE = `${environnement.API_URL}/restaurant/menus`;

  constructor(private http: HttpClientService) {}

  getAll(boutiqueId: number) {
    return this.http.get(this.BASE, { params: { boutique: boutiqueId } });
  }

  getToday(boutiqueId: number) {
    return this.http.get(`${this.BASE}/today`, { params: { boutique: boutiqueId } });
  }

  create(dto: { boutique: number; date: string; recettes: number[] }) {
    return this.http.post(this.BASE, dto);
  }

  update(id: number, recettes: number[]) {
    return this.http.patch(`${this.BASE}/${id}`, { recettes });
  }

  remove(id: number) {
    return this.http.delete(`${this.BASE}/${id}`);
  }
}
