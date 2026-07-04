import { Injectable } from '@angular/core';
import { HttpClientService } from '../http-client/http-client.service';
import { environnement } from '../../environnement/environnement';

@Injectable({ providedIn: 'root' })
export class AbonnementService {
  private readonly base = `${environnement.API_URL}/abonnement`;

  constructor(private http: HttpClientService) {}

  // Super admin
  getAll()                          { return this.http.get(this.base); }
  getOne(structureId: number)       { return this.http.get(`${this.base}/${structureId}`); }
  startTrial(structureId: number)   { return this.http.post(`${this.base}/essai/${structureId}`, {}); }
  subscribe(dto: { structureId: number; plan: string; montant?: number; notes?: string }) {
    return this.http.post(`${this.base}/souscrire`, dto);
  }
  suspend(id: number)               { return this.http.patch(`${this.base}/${id}/suspendre`, {}); }
  reactivate(id: number)            { return this.http.patch(`${this.base}/${id}/reactiver`, {}); }
  getPlans()                        { return this.http.get(`${this.base}/plans`); }
  savePlan(dto: { plan: string; montant: number; devise: string }) {
    return this.http.post(`${this.base}/plans`, dto);
  }

  // Config prix boutique supplémentaire (super_admin)
  getPrixBoutique()                 { return this.http.get(`${this.base}/config/prix-boutique`); }
  savePrixBoutique(dto: { montant: number; devise?: string }) {
    return this.http.post(`${this.base}/config/prix-boutique`, dto);
  }

  // Devis de renouvellement (super_admin)
  getDevis(structureId: number, plan: string) {
    return this.http.get(`${this.base}/${structureId}/devis/${plan}`);
  }

  // Boutiques facturées d'une structure (super_admin)
  getBoutiques(structureId: number)  { return this.http.get(`${this.base}/${structureId}/boutiques`); }
  syncBoutiques(structureId: number)                      { return this.http.post(`${this.base}/${structureId}/boutiques/sync`, {}); }
  retirerBoutique(structureId: number, boutiqueId: number)    { return this.http.patch(`${this.base}/${structureId}/boutiques/${boutiqueId}/retirer`, {}); }
  desactiverBoutique(structureId: number, boutiqueId: number) { return this.http.patch(`${this.base}/${structureId}/boutiques/${boutiqueId}/desactiver`, {}); }
  activerBoutique(structureId: number, boutiqueId: number)    { return this.http.patch(`${this.base}/${structureId}/boutiques/${boutiqueId}/activer`, {}); }

  // Factures
  getFacture(abonnementId: number)    { return this.http.get(`${this.base}/${abonnementId}/facture`); }
  getFacturePdf(abonnementId: number) { return this.http.get(`${this.base}/${abonnementId}/facture/pdf`); }

  // Tenant user
  getMySubscription()               { return this.http.get(`${this.base}/mon-abonnement`); }

  // Helpers
  static planLabel(plan: string): string {
    const labels: Record<string, string> = {
      essai: "Période d'essai", '1_mois': '1 mois', '3_mois': '3 mois', '6_mois': '6 mois', '1_an': '1 an',
    };
    return labels[plan] ?? plan;
  }

  static planMontant(plan: string, plans: any[]): number {
    return plans.find(p => p.plan === plan)?.montant ?? 0;
  }
}
