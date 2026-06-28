import { Injectable } from '@angular/core';
import { HttpClientService } from '../http-client/http-client.service';
import { environnement } from '../../environnement/environnement';

@Injectable({ providedIn: 'root' })
export class StockMouvementService {
  private readonly API_URL = environnement.API_URL;

  constructor(private http: HttpClientService) {}

  getMouvements(params: { boutique: number; page?: number; limit?: number }) {
    return this.http.get(`${this.API_URL}/mouvement-stock`, { params });
  }
}
