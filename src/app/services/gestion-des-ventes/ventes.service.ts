import { Injectable } from '@angular/core';
import { environnement } from '../../environnement/environnement';
import { HttpClientService } from '../http-client/http-client.service';

@Injectable({
  providedIn: 'root'
})
export class VentesService {
  private readonly API_URL = environnement.API_URL;

  constructor(private http: HttpClientService) { }

  getAllVentes(body: any) {
    return this.http.get(`${this.API_URL}/vente`, { params: body });
  }

  getAllVentesByBoutik(idBoutique: number) {
    return this.http.get(`${this.API_URL}/vente?boutique=${idBoutique}`);
  }

  getDetailVente(id: any) {
    return this.http.get(`${this.API_URL}/vente/${id}`);
  }

  saveVente(body: any) {
    return this.http.post(`${this.API_URL}/vente`, body);
  }

  updateVente(id: any, body: any) {
    return this.http.patch(`${this.API_URL}/vente/${id}`, body);
  }  
  
}
