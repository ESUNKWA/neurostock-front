import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { TenantService, TenantProvisionDto } from '../../../services/tenant/tenant.service';
import { StructureService } from '../../../services/structure/structure.service';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-ek-provision',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule],
  templateUrl: './ek-provision.component.html',
  providers: [ToastrService],
})
export default class EkProvisionComponent implements OnInit {
  structures: any[] = [];
  loadingStructures = false;
  isSubmitting = false;

  form: TenantProvisionDto = {
    structureId: 0,
    database: '',
    adminNom: '',
    adminPrenoms: '',
    adminTelephone: '',
    adminEmail: '',
    adminPassword: '',
  };

  constructor(
    private tenantSvc: TenantService,
    private structureSvc: StructureService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.loadingStructures = true;
    this.structureSvc.find()
      .pipe(finalize(() => (this.loadingStructures = false)))
      .subscribe({
        next: (r: any) => {
          this.structures = r?.data ?? (Array.isArray(r) ? r : []);
          // Pré-remplir depuis le queryParam ?structureId=X (lien depuis la page Structures)
          this.route.queryParams.subscribe(p => {
            if (p['structureId']) {
              this.form.structureId = +p['structureId'];
              this.onStructureChange();
            }
          });
        },
      });
  }

  onStructureChange(): void {
    if (this.form.structureId && !this.form.database) {
      this.form.database = `GESTION_STOCK_${this.form.structureId}_DB`;
    }
  }

  get isValid(): boolean {
    return !!this.form.structureId
      && !!this.form.database
      && !!this.form.adminNom
      && !!this.form.adminPrenoms
      && !!this.form.adminTelephone
      && !!this.form.adminPassword;
  }

  submit(): void {
    if (!this.isValid) return;

    const structureName = this.structures.find(s => s.id === +this.form.structureId)?.nom || `#${this.form.structureId}`;

    Swal.fire({
      title: 'Provisionner ce tenant ?',
      html: `La base <strong>${this.form.database}</strong> sera créée et configurée (paramètres serveur) pour la structure <strong>${structureName}</strong>.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Provisionner',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#6366f1',
    }).then(result => {
      if (!result.isConfirmed) return;

      this.isSubmitting = true;
      this.tenantSvc.provision({ ...this.form, structureId: +this.form.structureId })
        .pipe(finalize(() => (this.isSubmitting = false)))
        .subscribe({
          next: () => {
            this.toastr.success(`Tenant "${structureName}" provisionné avec succès`);
            this.form = { structureId: 0, database: '', adminNom: '', adminPrenoms: '', adminTelephone: '', adminEmail: '', adminPassword: '' };
          },
          error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors du provisionnement'),
        });
    });
  }
}
