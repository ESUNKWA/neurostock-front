import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DeviceService implements OnDestroy {
  private readonly mql = window.matchMedia('(max-width: 768px)');
  readonly isMobile$ = new BehaviorSubject<boolean>(this.mql.matches);

  private readonly onChange = (e: MediaQueryListEvent) => this.isMobile$.next(e.matches);

  constructor() {
    this.mql.addEventListener('change', this.onChange);
  }

  get isMobile(): boolean { return this.mql.matches; }

  ngOnDestroy(): void {
    this.mql.removeEventListener('change', this.onChange);
  }
}
