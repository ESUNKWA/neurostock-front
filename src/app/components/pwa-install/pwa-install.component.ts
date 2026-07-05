import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pwa-install',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showBanner) {
      <div class="pwa-banner">
        <div class="pwa-banner-body">
          <div class="pwa-icon">N</div>
          <div class="pwa-text">
            <strong>Installer NeuroStock</strong>
            <span>Accédez à l'app depuis votre écran d'accueil</span>
          </div>
        </div>
        <div class="pwa-actions">
          <button class="pwa-btn-install" (click)="install()">Installer</button>
          <button class="pwa-btn-close" (click)="dismiss()" aria-label="Fermer">✕</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .pwa-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      background: #0B4332;
      color: #fff;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 -4px 20px rgba(0,0,0,.25);
      animation: slideUp .3s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    .pwa-banner-body {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }
    .pwa-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: #F5AB2A;
      color: #0B4332;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      font-weight: 900;
      flex-shrink: 0;
    }
    .pwa-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .pwa-text strong {
      font-size: .9rem;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pwa-text span {
      font-size: .75rem;
      color: rgba(255,255,255,.65);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pwa-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .pwa-btn-install {
      background: #F5AB2A;
      color: #0B4332;
      border: none;
      border-radius: 7px;
      padding: 8px 16px;
      font-size: .85rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }
    .pwa-btn-close {
      background: rgba(255,255,255,.12);
      color: rgba(255,255,255,.7);
      border: none;
      border-radius: 6px;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .75rem;
      cursor: pointer;
    }
    .pwa-btn-close:hover { background: rgba(255,255,255,.22); color: #fff; }
  `],
})
export class PwaInstallComponent implements OnInit {
  showBanner = false;
  private deferredPrompt: any = null;

  ngOnInit(): void {
    // Déjà installée ou déjà refusée récemment → ne pas afficher
    if (this.isInstalled() || this.wasDismissed()) return;

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showBanner = true;
    });
  }

  async install(): Promise<void> {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      this.showBanner = false;
    }
    this.deferredPrompt = null;
  }

  dismiss(): void {
    this.showBanner = false;
    localStorage.setItem('pwa_dismissed', String(Date.now()));
  }

  private isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
  }

  private wasDismissed(): boolean {
    const ts = localStorage.getItem('pwa_dismissed');
    if (!ts) return false;
    // Réafficher après 7 jours
    return Date.now() - Number(ts) < 7 * 24 * 60 * 60 * 1000;
  }
}
