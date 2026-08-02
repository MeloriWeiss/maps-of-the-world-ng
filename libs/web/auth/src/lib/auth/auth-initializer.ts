import { inject } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '@wm/web/data-access/auth';

export const authInitializer = async () => {
  const authService = inject(AuthService);

  return firstValueFrom(
    authService.restoreSession().pipe(
      catchError(() => {
        return of(null);
      }),
    ),
  ).then();
};
