import { Injectable } from '@angular/core';
import { HttpClientService } from '../http-client/http-client.service';
import { environnement } from '../../environnement/environnement';

/**
 * Les paramètres de connexion à la base (hôte, port, identifiants) sont résolus
 * exclusivement côté backend (.env) — jamais saisis ni transmis depuis le frontend.
 * Seul le nom de la base tenant reste choisi via l'interface.
 */
export interface TenantProvisionDto {
  structureId: number;
  database: string;
  // Admin du tenant — créé automatiquement lors du provisionnement
  adminNom: string;
  adminPrenoms: string;
  adminTelephone: string;
  adminEmail: string;
  adminPassword: string;
}

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly base = `${environnement.API_URL}/tenant`;

  constructor(private http: HttpClientService) {}

  getAll()                          { return this.http.get(this.base); }
  getOne(structureId: number)       { return this.http.get(`${this.base}/${structureId}`); }
  provision(dto: TenantProvisionDto){ return this.http.post(`${this.base}/provision`, dto); }
  reset(structureId: number)        { return this.http.delete(`${this.base}/${structureId}/reset`); }
  deleteDatabase(structureId: number, confirmDatabase: string) {
    return this.http.delete(`${this.base}/${structureId}/database`, { body: { confirmDatabase } });
  }

  getStorage()                      { return this.http.get(`${this.base}/storage`); }
  getTables(structureId: number)    { return this.http.get(`${this.base}/${structureId}/tables`); }
  getTableContent(structureId: number, tableName: string, page = 1, limit = 20) {
    return this.http.get(`${this.base}/${structureId}/tables/${tableName}?page=${page}&limit=${limit}`);
  }
}
