import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { PrevisionService } from '../analyse-ia/prevision.service';

@Injectable({ providedIn: 'root' })
export class AlerteService implements OnDestroy {

  private readonly _count$ = new BehaviorSubject<number>(0);
  readonly count$ = this._count$.asObservable();

  private readonly _commandesCount$ = new BehaviorSubject<number>(0);
  readonly commandesCount$ = this._commandesCount$.asObservable();

  setCommandesCount(n: number): void {
    this._commandesCount$.next(n);
  }

  private boutiqueId = 0;
  private interval: any = null;

  constructor(
    private authService: AuthService,
    private previsionService: PrevisionService
  ) {
    this.authService.currentUser$.subscribe((user: any) => {
      const id = user?.boutique_id ?? 0;
      if (id && id !== this.boutiqueId) {
        this.boutiqueId = id;
        this.startPolling();
      }
    });
  }

  startPolling(): void {
    clearInterval(this.interval);
    this.load();
    this.interval = setInterval(() => this.load(), 5 * 60 * 1000);
  }

  private load(): void {
    if (!this.boutiqueId) return;
    this.previsionService.getResumeJournalier(this.boutiqueId).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        const ruptures: number = data?.stock?.produits_en_rupture ?? 0;
        const alertes: number  = data?.stock?.produits_en_alerte  ?? 0;
        const total = ruptures + alertes;
        const prev  = this._count$.value;
        this._count$.next(total);
        if (total > 0 && total !== prev) this.playSound(ruptures, alertes);
      }
    });
  }

  playSound(ruptures = 0, alertes = 0): void {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    let msg = 'Attention ! ';
    if (ruptures > 0 && alertes > 0) {
      msg += `${ruptures} produit${ruptures > 1 ? 's' : ''} en rupture de stock et `
           + `${alertes} produit${alertes > 1 ? 's' : ''} sous le seuil d'alerte.`;
    } else if (ruptures > 0) {
      msg += `${ruptures} produit${ruptures > 1 ? 's' : ''} en rupture de stock.`;
    } else {
      msg += `${alertes} produit${alertes > 1 ? 's' : ''} sous le seuil d'alerte.`;
    }

    const u = new SpeechSynthesisUtterance(msg);
    u.lang = 'fr-FR';
    u.rate = 0.92;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  }

  ngOnDestroy(): void {
    clearInterval(this.interval);
    window.speechSynthesis?.cancel();
  }
}
