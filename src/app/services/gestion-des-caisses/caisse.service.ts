import { Injectable } from '@angular/core';
import { environnement } from '../../environnement/environnement';
import { HttpClientService } from '../http-client/http-client.service';

const CAISSES_BASE = `${environnement.API_URL}/caisses`;

export interface FondCaisse {
  espece?: number;
  orange_money?: number;
  wave?: number;
  mtn_money?: number;
  moov_money?: number;
  dajmo?: number;
  carte?: number;
  credit?: number;
}

@Injectable({ providedIn: 'root' })
export class CaisseService {
  private readonly BASE = `${environnement.API_URL}/caisse`;

  constructor(private http: HttpClientService) {}

  /** Liste des sessions (historique) */
  getSessions(boutique: number, caissier?: string | null, page = 1, limit = 20) {
    const params: any = { boutique, page, limit };
    if (caissier) params['caissier'] = caissier;
    return this.http.get(this.BASE, { params });
  }

  /** Session active — caissier optionnel */
  getActiveSession(boutique: number, caissier?: string | null) {
    const params: any = { boutique };
    if (caissier) params['caissier'] = caissier;
    return this.http.get(`${this.BASE}/active`, { params });
  }

  /** Ouvrir une session */
  ouvrirSession(body: {
    boutique: number;
    caissier?: string | null;
    fond_ouverture: FondCaisse;
    note?: string;
  }) {
    return this.http.post(`${this.BASE}/ouvrir`, body);
  }

  /** Fermer une session — caissier en query param optionnel */
  fermerSession(id: number, body: { fond_fermeture: FondCaisse; notes?: string }, caissier?: string | null) {
    const params: any = {};
    if (caissier) params['caissier'] = caissier;
    return this.http.post(`${this.BASE}/${id}/fermer`, body, { params });
  }

  /** Ajouter un mouvement (entrée / sortie) */
  ajouterMouvement(id: number, body: {
    type: 'entree' | 'sortie';
    montant: number;
    motif: string;
    mode_paiement?: string;
    caissier?: string;
  }) {
    return this.http.post(`${this.BASE}/${id}/mouvement`, body);
  }

  /** Situation théorique en cours de session */
  getTheorique(id: number) {
    return this.http.get(`${this.BASE}/${id}/theorique`);
  }

  /** Rapport complet d'une session */
  getRapport(id: number) {
    return this.http.get(`${this.BASE}/${id}/rapport`);
  }

  // ── Caisses physiques ────────────────────────────────────────────────────────

  getCaisses(boutiqueId: number) {
    return this.http.get(CAISSES_BASE, { params: { boutique: boutiqueId } });
  }

  createCaisse(body: { boutique: number; nom: string; code: string; description?: string; emplacement?: string }) {
    return this.http.post(CAISSES_BASE, body);
  }

  updateCaisse(id: number, body: Partial<{ nom: string; code: string; description: string; emplacement: string; statut: string }>) {
    return this.http.patch(`${CAISSES_BASE}/${id}`, body);
  }

  toggleCaisseStatut(id: number) {
    return this.http.post(`${CAISSES_BASE}/${id}/toggle-statut`, {});
  }

  deleteCaisse(id: number) {
    return this.http.delete(`${CAISSES_BASE}/${id}`);
  }

  migrerCaisses(boutiqueId: number) {
    return this.http.post(`${CAISSES_BASE}/migrer?boutique=${boutiqueId}`, {});
  }
}
