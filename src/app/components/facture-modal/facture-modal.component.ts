import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AbonnementService } from '../../services/abonnement/abonnement.service';

@Component({
  selector: 'app-facture-modal',
  standalone: true,
  imports: [CommonModule],
  providers: [ToastrService],
  templateUrl: './facture-modal.component.html',
})
export class FactureModalComponent implements OnInit {
  @Input() abonnementId!: number;
  @Output() closed = new EventEmitter<void>();

  facture: any = null;
  loading = false;
  error: string | null = null;
  pdfLoading = false;

  readonly PLAN_LABELS: Record<string, string> = {
    essai: "Période d'essai", '1_mois': '1 mois', '3_mois': '3 mois', '6_mois': '6 mois', '1_an': '1 an',
  };

  constructor(private abonnementSvc: AbonnementService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.loading = true;
    this.abonnementSvc.getFacture(this.abonnementId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r: any) => { this.facture = r?.data ?? null; },
        error: (e: any) => { this.error = e?.error?.message || 'Impossible de charger la facture'; },
      });
  }

  downloadPdf(): void {
    this.pdfLoading = true;
    this.abonnementSvc.getFacturePdf(this.abonnementId)
      .pipe(finalize(() => (this.pdfLoading = false)))
      .subscribe({
        next: (blob: any) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `facture-${this.facture?.reference ?? this.abonnementId}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la génération du PDF'),
      });
  }

  planLabel(plan: string): string {
    return this.PLAN_LABELS[plan] ?? plan;
  }

  close(): void { this.closed.emit(); }
}
