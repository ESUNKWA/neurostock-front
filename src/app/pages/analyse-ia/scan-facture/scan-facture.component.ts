import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { PrevisionService } from '../../../services/analyse-ia/prevision.service';

interface LigneFacture {
  designation: string;
  quantite: number;
  prix_unitaire: number;
  montant_ligne: number;
}

interface ScanFactureResult {
  fournisseur: string;
  numero_facture: string;
  date_facture: string;
  montant_total: number;
  lignes: LigneFacture[];
  fiabilite: 'ok' | 'erreur_parsing';
  raw?: string;
}

@Component({
  selector: 'app-scan-facture',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ToastrModule],
  templateUrl: './scan-facture.component.html',
  styleUrl: './scan-facture.component.scss',
})
export default class ScanFactureComponent {
  private previsionService = inject(PrevisionService);
  private toastr = inject(ToastrService);
  private router = inject(Router);

  step: 'select' | 'scanning' | 'result' = 'select';
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isScanning = false;
  scanResult: ScanFactureResult | null = null;
  scanError: string | null = null;
  editableLines: LigneFacture[] = [];

  // Champs d'en-tête éditables
  editFournisseur = '';
  editNumeroFacture = '';
  editDateFacture = '';

  get totalEditable(): number {
    return this.editableLines.reduce((s, l) => s + (+(l.quantite) * +(l.prix_unitaire)), 0);
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    event.target.value = '';
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.toastr.error('Format non supporté. Utilisez JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.toastr.error('Image trop volumineuse (max 10 Mo).');
      return;
    }

    this.selectedFile = file;
    this.scanError = null;
    const reader = new FileReader();
    reader.onload = (e: any) => { this.previewUrl = e.target.result; };
    reader.readAsDataURL(file);
  }

  scanner(): void {
    if (!this.selectedFile) return;
    this.step = 'scanning';
    this.isScanning = true;
    this.scanError = null;

    this.previsionService.scanFacture(this.selectedFile).subscribe({
      next: (res: any) => {
        this.isScanning = false;
        const data: ScanFactureResult = res?.data ?? res;
        this.scanResult = data;
        this.editableLines = (data.lignes ?? []).map(l => ({ ...l }));
        this.editFournisseur = data.fournisseur ?? '';
        this.editNumeroFacture = data.numero_facture ?? '';
        this.editDateFacture = data.date_facture ?? '';
        this.step = 'result';
      },
      error: (err: any) => {
        this.isScanning = false;
        this.step = 'select';
        this.scanError = err?.error?.message ?? 'Erreur lors de l\'analyse de la facture.';
        this.toastr.error(this.scanError!);
      }
    });
  }

  recalculerLigne(ligne: LigneFacture): void {
    ligne.montant_ligne = +(ligne.quantite) * +(ligne.prix_unitaire);
  }

  ajouterLigne(): void {
    this.editableLines.push({ designation: '', quantite: 1, prix_unitaire: 0, montant_ligne: 0 });
  }

  supprimerLigne(index: number): void {
    this.editableLines.splice(index, 1);
  }

  reset(): void {
    this.step = 'select';
    this.selectedFile = null;
    this.previewUrl = null;
    this.scanResult = null;
    this.editableLines = [];
    this.scanError = null;
    this.editFournisseur = '';
    this.editNumeroFacture = '';
    this.editDateFacture = '';
  }

  validerEtNaviguer(): void {
    const payload = {
      fournisseur: this.editFournisseur,
      numero_facture: this.editNumeroFacture,
      date_facture: this.editDateFacture,
      lignes: this.editableLines,
      montant_total: this.totalEditable,
    };
    sessionStorage.setItem('scan_facture_result', JSON.stringify(payload));
    this.toastr.success('Données transmises — redirigé vers l\'approvisionnement.');
    this.router.navigate(['/gestion-des-approvisionnements/approvisionnement']);
  }
}
