import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TenantService } from '../../../services/tenant/tenant.service';

@Component({
  selector: 'app-ek-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ek-dashboard.component.html',
})
export default class EkDashboardComponent implements OnInit {
  tenants: any[] = [];
  loading = false;

  constructor(private tenantSvc: TenantService) {}

  ngOnInit(): void {
    this.loading = true;
    this.tenantSvc.getAll()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({ next: (r: any) => { this.tenants = r?.data ?? (Array.isArray(r) ? r : []); } });
  }

  get totalTenants()   { return this.tenants.length; }
  get activeTenants()  { return this.tenants.filter(t => t.isActive !== false).length; }
  get pendingTenants() { return this.tenants.filter(t => t.isActive === false).length; }
}
