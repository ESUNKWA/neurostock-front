import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { TenantService } from '../../../services/tenant/tenant.service';

@Component({
  selector: 'app-ek-tenants',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ek-tenants.component.html',
  providers: [ToastrService],
})
export default class EkTenantsComponent implements OnInit {
  tenants: any[] = [];
  loading = false;
  resetting: number | null = null;

  constructor(private tenantSvc: TenantService, private toastr: ToastrService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.tenantSvc.getAll()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({ next: (r: any) => { this.tenants = r?.data ?? (Array.isArray(r) ? r : []); } });
  }

  resetPool(tenant: any): void {
    Swal.fire({
      title: 'Réinitialiser le pool ?',
      html: `La connexion vers <strong>${tenant.database}</strong> sera fermée et recréée.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Réinitialiser',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#f59e0b',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.resetting = tenant.structureId;
      this.tenantSvc.reset(tenant.structureId)
        .pipe(finalize(() => (this.resetting = null)))
        .subscribe({
          next: () => this.toastr.success('Pool réinitialisé avec succès'),
          error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la réinitialisation'),
        });
    });
  }
}
