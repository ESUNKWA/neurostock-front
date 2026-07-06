import { Injectable } from '@angular/core';
import { HttpClientService } from '../http-client/http-client.service';
import { environnement } from '../../environnement/environnement';

export interface AchatParams {
  boutique: number;
  date_debut?: string;
  date_fin?: string;
}

@Injectable({ providedIn: 'root' })
export class AchatsService {
  private readonly API_URL = environnement.API_URL;

  constructor(private http: HttpClientService) {}

  getAllAchats(params: AchatParams) {
    return this.http.get(`${this.API_URL}/achat`, { params });
  }

  getDetailsAchat(id: any) {
    return this.http.get(`${this.API_URL}/achat/${id}`);
  }

  createAchat(achat: any) {
    return this.http.post(`${this.API_URL}/achat`, achat);
  }

  updateAchat(id: any, achat: any) {
    return this.http.patch(`${this.API_URL}/achat/${id}`, achat);
  }
}
