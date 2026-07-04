import { Injectable } from '@angular/core';
import { environnement } from '../../environnement/environnement';
import { HttpClientService } from '../http-client/http-client.service';

@Injectable({
  providedIn: 'root'
})
export class ProduitService {
  private readonly API_URL = environnement.API_URL;

  constructor(private http: HttpClientService) { }

  getProduits(body: any = {}) {
    return this.http.get(`${this.API_URL}/produit`, { params: body });
  }

  getProduitById(id: number) {  
    return this.http.get(`${this.API_URL}/produit/${id}`);
  }

  createProduit(produit: any) {
    // Si c'est un FormData, ne pas ajouter l'en-tête Content-Type
    const options = isFormData(produit) ? {} : undefined;
    return this.http.post(`${this.API_URL}/produit`, produit, options);
  }
  
  updateProduit(id: number, produit: any) {
    // Si c'est un FormData, ne pas ajouter l'en-tête Content-Type
    const options = isFormData(produit) ? {} : undefined;
    return this.http.patch(`${this.API_URL}/produit/${id}`, produit, options);
  }

  deleteProduit(id: number) {
    return this.http.delete(`${this.API_URL}/produit/${id}`);
  }

  scanByCodeBarre(code: string, boutique: number) {
    return this.http.get(`${this.API_URL}/produit/scan/${code}`, { params: { boutique } });
  }

  importProduits(file: File, boutiqueId: number) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.API_URL}/produit/import?boutique=${boutiqueId}`, formData, {});
  }
}

// Fonction utilitaire pour vérifier si l'objet est un FormData
function isFormData(value: any): boolean {
  return value instanceof FormData;
}
