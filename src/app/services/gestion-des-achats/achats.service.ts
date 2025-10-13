import { Injectable } from '@angular/core';
import { HttpClientService } from '../http-client/http-client.service';
import { environnement } from '../../environnement/environnement';
@Injectable({
  providedIn: 'root'
})
export class AchatsService {
  private readonly API_URL = environnement.API_URL;

  constructor(private http: HttpClientService) { }

  getAllAchats(body: any) {
    return this.http.get(`${this.API_URL}/achat`, { params: body });
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
