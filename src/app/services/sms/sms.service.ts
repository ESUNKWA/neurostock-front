import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from '../http-client/http-client.service';

@Injectable({ providedIn: 'root' })
export class SmsService {
  private readonly base = '/api/sms';

  constructor(private http: HttpClientService) {}

  envoyerRapportJournalier(destinataire: string): Observable<any> {
    return this.http.post(`${this.base}/rapport-journalier/envoyer`, { destinataire });
  }

  getLogs(params?: { structureId?: number; type?: string; limit?: number }): Observable<any> {
    const query = new URLSearchParams();
    if (params?.structureId) query.set('structureId', String(params.structureId));
    if (params?.type)        query.set('type', params.type);
    if (params?.limit)       query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.http.get(`${this.base}/logs${qs ? '?' + qs : ''}`);
  }
}
