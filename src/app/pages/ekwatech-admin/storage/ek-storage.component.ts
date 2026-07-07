import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { TenantService } from '../../../services/tenant/tenant.service';

@Component({
  selector: 'app-ek-storage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ek-storage.component.html',
})
export default class EkStorageComponent implements OnInit {
  items: any[] = [];
  loading = false;
  error: string | null = null;

  constructor(private tenantSvc: TenantService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = null;
    this.tenantSvc.getStorage()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r: any) => { this.items = r?.data ?? (Array.isArray(r) ? r : []); },
        error: (e: any) => { this.error = e?.error?.message || 'Impossible de charger les données de stockage'; },
      });
  }

  // ── Conversion chaîne formatée → octets ──────────────────────────────────
  // Gère : "0 B", "9533 kB", "973.33 KB", "2.38 MB", "3.54 GB"

  parseSize(str: string): number {
    if (!str) return 0;
    const trimmed = str.trim();
    if (trimmed === '0 B' || trimmed === '0') return 0;
    const match = trimmed.match(/^([\d.]+)\s*([a-zA-Z]+)$/);
    if (!match) return 0;
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    switch (unit) {
      case 'B':  return val;
      case 'KB': return val * 1024;
      case 'MB': return val * 1024 * 1024;
      case 'GB': return val * 1024 * 1024 * 1024;
      default:   return val;
    }
  }

  fichiersBytes(item: any): number { return this.parseSize(item.total_fichiers); }
  dbBytes(item: any):       number { return this.parseSize(item.base_de_donnees); }
  combinedBytes(item: any): number { return this.fichiersBytes(item) + this.dbBytes(item); }

  // ── Calculs globaux ───────────────────────────────────────────────────────

  get grandTotalFichiers(): number { return this.items.reduce((s, i) => s + this.fichiersBytes(i), 0); }
  get grandTotalDb():       number { return this.items.reduce((s, i) => s + this.dbBytes(i), 0); }
  get grandTotal():         number { return this.grandTotalFichiers + this.grandTotalDb; }

  get totalProduits(): number { return this.items.reduce((s, i) => s + this.parseSize(i.fichiers?.produits), 0); }
  get totalLogos():    number { return this.items.reduce((s, i) => s + this.parseSize(i.fichiers?.logos), 0); }
  get totalPdfs():     number { return this.items.reduce((s, i) => s + this.parseSize(i.fichiers?.pdfs), 0); }

  get maxCombinedBytes(): number {
    return Math.max(...this.items.map(i => this.combinedBytes(i)), 1);
  }

  barWidth(item: any): number {
    return Math.round((this.combinedBytes(item) / this.maxCombinedBytes) * 100);
  }

  dbBarWidth(item: any): number {
    const combined = this.combinedBytes(item);
    if (combined === 0) return 0;
    return Math.round((this.dbBytes(item) / combined) * 100);
  }

  barColor(pct: number): string {
    if (pct >= 80) return '#dc3545';
    if (pct >= 50) return '#f59e0b';
    return '#198754';
  }

  // ── Formatage octets → lisible ────────────────────────────────────────────

  formatBytes(bytes: number): string {
    if (bytes <= 0) return '0 B';
    if (bytes < 1024)             return `${bytes.toFixed(0)} B`;
    if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
}
