import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClientService } from '../http-client/http-client.service';
import { environnement } from '../../environnement/environnement';

export type ModuleCode =
  | 'commandes_fournisseurs'
  | 'devis'
  | 'commandes_clients'
  | 'retours_produits'
  | 'caisse'
  | 'ia'
  | 'restauration'
  | 'clients'
  | 'fournisseurs'
  | 'prix_achat_optionnel';

export const MODULE_LABELS: Record<ModuleCode, string> = {
  commandes_fournisseurs: 'Commandes fournisseurs',
  devis: 'Devis',
  commandes_clients: 'Commandes clients',
  retours_produits: 'Retours produits',
  caisse: 'Gestion de caisse',
  ia: 'Analyse IA',
  restauration: 'Restauration',
  clients: 'Gestion des clients',
  fournisseurs: 'Gestion des fournisseurs',
  prix_achat_optionnel: 'Prix d\'achat non obligatoire à l\'approvisionnement',
};

@Injectable({ providedIn: 'root' })
export class ModuleService {
  private readonly API_URL = environnement.API_URL;

  private modulesSubject = new BehaviorSubject<ModuleCode[]>(this.loadFromStorage());
  modules$ = this.modulesSubject.asObservable();

  private loadFromStorage(): ModuleCode[] {
    const raw = localStorage.getItem('modules');
    return raw ? JSON.parse(raw) : [];
  }

  setModules(modules: ModuleCode[]): void {
    localStorage.setItem('modules', JSON.stringify(modules));
    this.modulesSubject.next(modules);
  }

  hasModule(code: ModuleCode): boolean {
    return this.modulesSubject.getValue().includes(code);
  }

  clear(): void {
    localStorage.removeItem('modules');
    this.modulesSubject.next([]);
  }

  /** Récupère les modules d'une structure (pour le super admin) */
  getByStructure(structureId: number) {
    return this.http.get(`${this.API_URL}/module-structure/${structureId}`);
  }

  /** Met à jour les modules d'une structure */
  updateModules(structureId: number, modules: { module: ModuleCode; est_actif: boolean }[]) {
    return this.http.put(`${this.API_URL}/module-structure/${structureId}`, { modules });
  }

  constructor(private http: HttpClientService) {}
}
