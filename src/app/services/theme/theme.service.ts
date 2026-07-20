import { Injectable } from '@angular/core';

const DEFAULT_COLOR = '#1e3a5f';
const STORAGE_KEY = 'app_theme_color';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  init(): void {
    const color = localStorage.getItem(STORAGE_KEY) ?? DEFAULT_COLOR;
    this.apply(color);
  }

  apply(hex: string | null | undefined): void {
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
      hex = DEFAULT_COLOR;
    }
    localStorage.setItem(STORAGE_KEY, hex);

    // hex = couleur de fond directe de la sidebar / navbar
    const [h, s, l] = this.hexToHsl(hex);
    const [r, g, b] = this.hexToRgb(hex);

    const sidebarBg      = hex;                                                          // fond sidebar = couleur choisie
    const sidebarDarker  = this.hslToHex(h, s, Math.max(2, l - 8));                    // légèrement plus sombre
    const accent         = this.hslToHex(h, Math.min(100, s + 8), Math.min(88, l + 40)); // teinte claire pour les icônes actifs
    const text           = this.hslToHex(h, Math.max(0, s - 20), Math.min(85, l + 42)); // texte lisible sur fond sombre
    const textActive     = this.hslToHex(h, Math.max(0, s - 30), Math.min(95, l + 60)); // texte actif très clair
    const textMuted      = this.hslToHex(h, Math.max(0, s - 10), Math.min(75, l + 22)); // texte atténué
    const [ar, ag, ab]   = this.hexToRgb(accent);

    const el = this.getOrCreateStyleTag();
    el.textContent = `
:root {
  /* Sidebar tenant */
  --sidebar-bg: ${sidebarBg};
  --sidebar-bg-darker: ${sidebarDarker};
  --sidebar-accent: ${accent};
  --sidebar-text: ${text};
  --sidebar-text-active: ${textActive};
  --sidebar-text-muted: ${textMuted};
  --sidebar-active-bg: rgba(${ar}, ${ag}, ${ab}, 0.15);
  /* POS navbar */
  --pos-nav-bg: linear-gradient(135deg, ${sidebarDarker} 0%, ${hex} 100%);
  --pos-nav-bg-solid: ${sidebarDarker};
  /* Bootstrap */
  --bs-primary: ${hex};
  --bs-primary-rgb: ${r}, ${g}, ${b};
  --bs-link-color: ${hex};
  --bs-link-hover-color: ${sidebarDarker};
}
.btn-primary {
  --bs-btn-bg: ${hex};
  --bs-btn-border-color: ${hex};
  --bs-btn-hover-bg: ${sidebarDarker};
  --bs-btn-hover-border-color: ${sidebarDarker};
  --bs-btn-active-bg: ${sidebarDarker};
  --bs-btn-active-border-color: ${sidebarDarker};
  --bs-btn-focus-shadow-rgb: ${r}, ${g}, ${b};
  --bs-btn-disabled-bg: ${hex};
  --bs-btn-disabled-border-color: ${hex};
}
.btn-outline-primary {
  --bs-btn-color: ${hex};
  --bs-btn-border-color: ${hex};
  --bs-btn-hover-bg: ${hex};
  --bs-btn-hover-border-color: ${hex};
  --bs-btn-active-bg: ${hex};
  --bs-btn-focus-shadow-rgb: ${r}, ${g}, ${b};
}
.text-primary { color: ${hex} !important; }
.bg-primary { background-color: ${hex} !important; }
.border-primary { border-color: ${hex} !important; }
.badge.bg-primary, span.bg-primary { background-color: ${hex} !important; }
.badge.bg-primary-subtle { background-color: rgba(${r}, ${g}, ${b}, 0.12) !important; color: ${hex} !important; }
`;
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.apply(DEFAULT_COLOR);
  }

  // ── Color utilities ────────────────────────────────────────────────────────

  private getOrCreateStyleTag(): HTMLStyleElement {
    let el = document.getElementById('app-theme') as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = 'app-theme';
      document.head.appendChild(el);
    }
    return el;
  }

  private hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  private hexToHsl(hex: string): [number, number, number] {
    let [r, g, b] = this.hexToRgb(hex).map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }

  private hslToHex(h: number, s: number, l: number): string {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }
}
