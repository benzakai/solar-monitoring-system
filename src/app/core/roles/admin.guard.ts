import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { map, of, switchMap, take } from 'rxjs';
import { CurrentUserService } from '../../features/people/services/current-user.service';
import { UserRole } from '../../endpoint/users.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AngularFireAuth);
  const currentUserService = inject(CurrentUserService);
  const router = inject(Router);

  return auth.authState.pipe(
    take(1),
    switchMap((authUser) => {
      if (!authUser) {
        return of(router.createUrlTree(['/login']));
      }

      return currentUserService.user.pipe(
        take(1),
        map((user) =>
          user?.role === UserRole.ADMIN
            ? true
            : router.createUrlTree(['/systems'])
        )
      );
    })
  );
};


