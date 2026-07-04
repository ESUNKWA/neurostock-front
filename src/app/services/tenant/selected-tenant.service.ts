import { Injectable, signal } from '@angular/core';

/**
 * Stores the structure the super_admin is currently acting on behalf of.
 * The tenantContextInterceptor reads this and injects X-Structure-Id header,
 * which the backend TenantMiddleware uses to resolve the correct tenant DB.
 */
@Injectable({ providedIn: 'root' })
export class SelectedTenantService {
  private readonly _structureId = signal<number | null>(null);

  readonly structureId = this._structureId.asReadonly();

  set(id: number | null): void {
    this._structureId.set(id);
  }

  clear(): void {
    this._structureId.set(null);
  }
}
