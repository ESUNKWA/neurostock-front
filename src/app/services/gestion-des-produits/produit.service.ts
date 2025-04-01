import { Injectable } from '@angular/core';
import { environnement } from '../../environnement/environnement';
import { HttpClientService } from '../http-client/http-client.service';

@Injectable({
  providedIn: 'root'
})
export class ProduitService {
  private readonly API_URL = environnement.API_URL;

  constructor(private http: HttpClientService) { }

  getProduits() {
    return this.http.get(`${this.API_URL}/produit`);
  }

  getProduitById(id: number) {  
    return this.http.get(`${this.API_URL}/produit/${id}`);
  }

  createProduit(produit: any) {
    return this.http.post(`${this.API_URL}/produit`, produit);
  }
  
  updateProduit(id: number, produit: any) {
    return this.http.put(`${this.API_URL}/produit/${id}`, produit);
  }

  deleteProduit(id: number) {
    return this.http.delete(`${this.API_URL}/produit/${id}`);
  }
  
}
