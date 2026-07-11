import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { environnement } from '../../environnement/environnement';

// ── Types d'événements émis par le backend ─────────────────────────────────────

export interface WsNouvelleCommande {
  type: 'nouvelle_commande';
  data: any;
}
export interface WsAppelServeur {
  type: 'appel_serveur';
  data: { table: any; boutique_id: number };
}
export interface WsStatutChange {
  type: 'statut_change';
  data: { id: number; statut: string };
}
export type WsEvent = WsNouvelleCommande | WsAppelServeur | WsStatutChange;

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

@Injectable({ providedIn: 'root' })
export class RestaurantSocketService implements OnDestroy {

  private es: EventSource | null = null;
  private boutiqueId: number | null = null;
  private destroyed = false;
  private reconnectTimer: any = null;
  private reconnectDelay = 2000;
  private readonly MAX_DELAY = 30_000;

  private readonly _event$ = new Subject<WsEvent>();
  private readonly _status$ = new Subject<SocketStatus>();

  readonly event$: Observable<WsEvent> = this._event$.asObservable();
  readonly status$: Observable<SocketStatus> = this._status$.asObservable();

  readonly nouvelleCommande$: Observable<any> = this._event$.pipe(
    filter((e): e is WsNouvelleCommande => e.type === 'nouvelle_commande'),
    map(e => e.data),
  );
  readonly appelServeur$: Observable<any> = this._event$.pipe(
    filter((e): e is WsAppelServeur => e.type === 'appel_serveur'),
    map(e => e.data),
  );
  readonly statutChange$: Observable<{ id: number; statut: string }> = this._event$.pipe(
    filter((e): e is WsStatutChange => e.type === 'statut_change'),
    map(e => e.data),
  );

  constructor(private zone: NgZone) {}

  // ── API publique ──────────────────────────────────────────────────────────────

  connect(boutiqueId: number): void {
    if (this.boutiqueId === boutiqueId && this.es?.readyState === EventSource.OPEN) return;
    this.boutiqueId = boutiqueId;
    this.reconnectDelay = 2000;
    this._closeSource();
    this._open();
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this._closeSource();
    this.boutiqueId = null;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.disconnect();
    this._event$.complete();
    this._status$.complete();
  }

  // ── Interne ───────────────────────────────────────────────────────────────────

  private _open(): void {
    if (this.destroyed || !this.boutiqueId) return;

    const apiUrl = (environnement as any).API_URL as string;
    const url = `${apiUrl}/events/stream?boutique=${this.boutiqueId}`;

    this._emit('connecting');

    try {
      this.es = new EventSource(url);
    } catch {
      this._emit('error');
      this._scheduleReconnect();
      return;
    }

    this.es.onopen = () => {
      this.reconnectDelay = 2000;
      this._emit('connected');
    };

    this.es.onmessage = (ev: MessageEvent) => {
      try {
        const msg: WsEvent = JSON.parse(ev.data as string);
        if (msg?.type) {
          this.zone.run(() => this._event$.next(msg));
        }
      } catch { /* message non-JSON ignoré */ }
    };

    this.es.onerror = () => {
      this._emit('error');
      this._closeSource();
      if (!this.destroyed && this.boutiqueId) {
        this._scheduleReconnect();
      }
    };
  }

  private _closeSource(): void {
    if (!this.es) return;
    this.es.onopen = null;
    this.es.onmessage = null;
    this.es.onerror = null;
    try { this.es.close(); } catch { /* ignore */ }
    this.es = null;
    this._emit('disconnected');
  }

  private _scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.MAX_DELAY);
      this._open();
    }, this.reconnectDelay);
  }

  private _emit(status: SocketStatus): void {
    this.zone.run(() => this._status$.next(status));
  }
}
