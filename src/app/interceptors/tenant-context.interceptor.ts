import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { SelectedTenantService } from '../services/tenant/selected-tenant.service';
import { catchError, throwError } from 'rxjs';
import Swal from 'sweetalert2';

const TENANT_ERROR_MSG = 'Aucun contexte tenant actif';

export const tenantContextInterceptor: HttpInterceptorFn = (req, next) => {
  const auth              = inject(AuthService);
  const router            = inject(Router);
  const selectedTenant    = inject(SelectedTenantService);

  const user         = auth.getUser();
  const isSuperAdmin = user?.profil?.code === 'super_admin';

  // When super_admin has selected a structure context, inject the header so the
  // backend TenantMiddleware can resolve the correct tenant DB.
  if (isSuperAdmin) {
    const structureId = selectedTenant.structureId();
    if (structureId) {
      req = req.clone({
        setHeaders: { 'X-Structure-Id': String(structureId) },
      });
    }
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (!isSuperAdmin && err.status === 500 && err.error?.message?.includes(TENANT_ERROR_MSG)) {
        Swal.fire({
          icon: 'error',
          title: 'Compte non configuré',
          html: `Votre compte n'est pas rattaché à une structure valide.<br>
                 <span class="text-muted small">Contactez votre administrateur.</span>`,
          confirmButtonText: 'Se déconnecter',
          confirmButtonColor: '#dc3545',
          allowOutsideClick: false,
          allowEscapeKey: false,
        }).then(() => {
          auth.logout();
          router.navigateByUrl('/login');
        });
      }
      return throwError(() => err);
    }),
  );
};
