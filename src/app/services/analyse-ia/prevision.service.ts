import { Injectable } from '@angular/core';
import { environnement } from '../../environnement/environnement';
import { HttpClientService } from '../http-client/http-client.service';

@Injectable({ providedIn: 'root' })
export class PrevisionService {
  private readonly BASE = environnement.API_URL;

  constructor(private http: HttpClientService) {}

  getRuptureStock(boutique: number, jours: number = 30) {
    return this.http.get(`${this.BASE}/prevision/rupture`, { params: { boutique, jours } });
  }

  getPrixSuggere(produitId: number, boutiqueId: number) {
    return this.http.get(`${this.BASE}/ai/prix-suggere`, { params: { produit: produitId, boutique: boutiqueId } });
  }

  getResumeJournalier(boutiqueId: number) {
    return this.http.get(`${this.BASE}/ai/resume-journalier`, { params: { boutique: boutiqueId } });
  }

  scanFacture(file: File) {
    const formData = new FormData();
    formData.append('facture', file);
    return this.http.post(`${this.BASE}/ai/scan-facture`, formData, {});
  }
}
