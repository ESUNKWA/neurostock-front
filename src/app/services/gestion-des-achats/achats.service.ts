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
  
  createAchat(achat: any) {
    return this.http.post(`${this.API_URL}/achat`, achat);
  }
}
