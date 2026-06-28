import { Injectable } from '@angular/core';
import { HttpClientService } from '../http-client/http-client.service';
import { environnement } from '../../environnement/environnement';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly API_URL = environnement.API_URL;

  constructor(private http: HttpClientService) {}

  getClientsByBoutique(boutiqueId: number) {
    return this.http.get(`${this.API_URL}/client?boutique=${boutiqueId}`);
  }

  addClient(body: any) {
    return this.http.post(`${this.API_URL}/client`, body);
  }

  updateClient(id: number, body: any) {
    return this.http.put(`${this.API_URL}/client/${id}`, body);
  }

  deleteClient(id: number) {
    return this.http.delete(`${this.API_URL}/client/${id}`);
  }
}
