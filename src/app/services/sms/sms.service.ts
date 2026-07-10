import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from '../http-client/http-client.service';
import { AuthService } from '../auth/auth.service';
import { environnement } from '../../environnement/environnement';

@Injectable({ providedIn: 'root' })
export class SmsService {
 private readonly API_URL = environnement.API_URL;

  constructor(private http: HttpClientService, private auth: AuthService) {}

  envoyerRapportJournalier(destinataire: string): Observable<any> {
    const structureId = this.auth.getUser()?.structure_id ?? null;
    return this.http.post(`${this.API_URL}/sms/rapport-journalier/envoyer`, { destinataire, structureId });
  }

  getLogs(params?: { structureId?: number; type?: string; limit?: number }): Observable<any> {
    const query = new URLSearchParams();
    if (params?.structureId) query.set('structureId', String(params.structureId));
    if (params?.type)        query.set('type', params.type);
    if (params?.limit)       query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.http.get(`${this.API_URL}/sms/logs${qs ? '?' + qs : ''}`);
  }
}
