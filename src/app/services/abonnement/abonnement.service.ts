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
  subscribe(dto: { structureId: number; plan: string; montant?: number; notes?: string; remise_type?: string; remise_valeur?: number }) {
    return this.http.post(`${this.base}/souscrire`, dto);
  }
  suspend(id: number)               { return this.http.patch(`${this.base}/${id}/suspendre`, {}); }
  reactivate(id: number)            { return this.http.patch(`${this.base}/${id}/reactiver`, {}); }
  valider(id: number, body?: { remise_type?: string; remise_valeur?: number }) {
    return this.http.patch(`${this.base}/${id}/valider`, body ?? {});
  }
  getPlans()                        { return this.http.get(`${this.base}/plans`); }
  savePlan(dto: { plan: string; montant: number; devise: string }) {
    return this.http.post(`${this.base}/plans`, dto);
  }

  // Catégories de structures (super_admin)
  getCategories()                          { return this.http.get(`${this.base}/config/categories`); }
  createCategorie(dto: { label: string; description?: string; ordre?: number }) {
    return this.http.post(`${this.base}/config/categories`, dto);
  }
  updateCategorie(id: number, dto: Partial<{ label: string; description: string; est_actif: boolean; ordre: number }>) {
    return this.http.patch(`${this.base}/config/categories/${id}`, dto);
  }
  deleteCategorie(id: number)              { return this.http.delete(`${this.base}/config/categories/${id}`); }
  upsertTarifCategorie(categorieId: number, dto: { plan: string; montant: number; devise?: string }) {
    return this.http.post(`${this.base}/config/categories/${categorieId}/tarifs`, dto);
  }
  deleteTarifCategorie(categorieId: number, plan: string) {
    return this.http.delete(`${this.base}/config/categories/${categorieId}/tarifs/${plan}`);
  }

  // Config frais de mise en place (super_admin)
  getFraisSetup()                            { return this.http.get(`${this.base}/config/frais-setup`); }
  createFraisSetup(dto: { label: string; montant: number; devise?: string; ordre?: number }) {
    return this.http.post(`${this.base}/config/frais-setup`, dto);
  }
  updateFraisSetup(id: number, dto: Partial<{ label: string; montant: number; est_actif: boolean; ordre: number }>) {
    return this.http.patch(`${this.base}/config/frais-setup/${id}`, dto);
  }
  deleteFraisSetup(id: number)               { return this.http.delete(`${this.base}/config/frais-setup/${id}`); }

  // Config prix boutique supplémentaire (super_admin)
  getPrixBoutique() { return this.http.get(`${this.base}/config/prix-boutique`); }
  savePrixBoutique(dto: { valeur: number; type: 'pourcentage' | 'montant' }) {
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
  getFacturePdf(abonnementId: number) {
    return this.http.get(`${this.base}/${abonnementId}/facture/pdf`, { responseType: 'blob' });
  }

  // Contrat
  getContratPdf(abonnementId: number) {
    return this.http.get(`${this.base}/${abonnementId}/contrat/pdf`, { responseType: 'blob' });
  }

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
