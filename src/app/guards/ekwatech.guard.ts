import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

export const ekwatechGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const user   = auth.getUser();
  if (user?.profil?.code === 'super_admin') return true;
  return router.createUrlTree([auth.isAuthenticated() ? '/dashboard' : '/login']);
};
