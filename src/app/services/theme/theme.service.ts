import { Injectable } from '@angular/core';

const DEFAULT_PRIMARY   = '#1e3a5f';
const DEFAULT_SECONDARY = '#94c6f7';
const KEY_PRIMARY   = 'app_theme_primary';
const KEY_SECONDARY = 'app_theme_secondary';

export interface AppTheme {
  couleur_primaire?:   string | null;
  couleur_secondaire?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {

  init(): void {
    const primary   = localStorage.getItem(KEY_PRIMARY)   ?? DEFAULT_PRIMARY;
    const secondary = localStorage.getItem(KEY_SECONDARY) ?? DEFAULT_SECONDARY;
    this.apply({ couleur_primaire: primary, couleur_secondaire: secondary });
  }

  apply(theme: AppTheme): void {
    const primary   = this.validHex(theme.couleur_primaire)   ?? DEFAULT_PRIMARY;
    const secondary = this.validHex(theme.couleur_secondaire) ?? DEFAULT_SECONDARY;

    localStorage.setItem(KEY_PRIMARY,   primary);
    localStorage.setItem(KEY_SECONDARY, secondary);

    // Dérivation à partir du fond (primary) ─────────────────────────────────
    const [ph, ps, pl] = this.hexToHsl(primary);
    const [pr, pg, pb] = this.hexToRgb(primary);
    const bgDarker     = this.hslToHex(ph, ps, Math.max(2, pl - 8));

    // Dérivation à partir de la couleur de texte (secondary) ─────────────────
    const [sh, ss, sl] = this.hexToHsl(secondary);
    const [sr, sg, sb] = this.hexToRgb(secondary);
    const textActive   = this.hslToHex(sh, Math.max(0, ss - 15), Math.min(97, sl + 18));
    const textMuted    = this.hslToHex(sh, Math.max(0, ss - 10), Math.max(20, sl - 20));
    const activeBg     = `rgba(${sr}, ${sg}, ${sb}, 0.14)`;

    const el = this.getOrCreateStyleTag();
    el.textContent = `
:root {
  /* ── Sidebar tenant ── */
  --sidebar-bg:          ${primary};
  --sidebar-bg-darker:   ${bgDarker};
  --sidebar-accent:      ${secondary};
  --sidebar-text:        ${secondary};
  --sidebar-text-active: ${textActive};
  --sidebar-text-muted:  ${textMuted};
  --sidebar-active-bg:   ${activeBg};
  /* ── POS navbar ── */
  --pos-nav-bg:          linear-gradient(135deg, ${bgDarker} 0%, ${primary} 100%);
  --pos-nav-bg-solid:    ${bgDarker};
  /* ── Bootstrap ── */
  --bs-primary:          ${primary};
  --bs-primary-rgb:      ${pr}, ${pg}, ${pb};
  --bs-link-color:       ${primary};
  --bs-link-hover-color: ${bgDarker};
}
.btn-primary {
  --bs-btn-bg:                ${primary};
  --bs-btn-border-color:      ${primary};
  --bs-btn-hover-bg:          ${bgDarker};
  --bs-btn-hover-border-color:${bgDarker};
  --bs-btn-active-bg:         ${bgDarker};
  --bs-btn-active-border-color:${bgDarker};
  --bs-btn-focus-shadow-rgb:  ${pr}, ${pg}, ${pb};
  --bs-btn-disabled-bg:       ${primary};
  --bs-btn-disabled-border-color:${primary};
}
.btn-outline-primary {
  --bs-btn-color:             ${primary};
  --bs-btn-border-color:      ${primary};
  --bs-btn-hover-bg:          ${primary};
  --bs-btn-hover-border-color:${primary};
  --bs-btn-active-bg:         ${primary};
  --bs-btn-focus-shadow-rgb:  ${pr}, ${pg}, ${pb};
}
.text-primary  { color: ${primary} !important; }
.bg-primary    { background-color: ${primary} !important; }
.border-primary{ border-color: ${primary} !important; }
.badge.bg-primary, span.bg-primary { background-color: ${primary} !important; }
.badge.bg-primary-subtle { background-color: rgba(${pr}, ${pg}, ${pb}, 0.12) !important; color: ${primary} !important; }
`;
  }

  clear(): void {
    localStorage.removeItem(KEY_PRIMARY);
    localStorage.removeItem(KEY_SECONDARY);
    this.apply({ couleur_primaire: DEFAULT_PRIMARY, couleur_secondaire: DEFAULT_SECONDARY });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private validHex(hex: string | null | undefined): string | null {
    if (hex && /^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
    return null;
  }

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
