import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.initializedChanges.pipe(
    filter(Boolean),
    take(1),
    map(() => auth.isAuthenticated() || router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })),
  );
};
