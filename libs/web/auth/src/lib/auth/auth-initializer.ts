import { inject } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProfileService } from '@wm/web/data-access/profile';

export const authInitializer = async () => {
  const profileService = inject(ProfileService);

  return firstValueFrom(
    profileService.getMe().pipe(
      catchError(() => {
        return of(null);
      }),
    ),
  ).then();
};
