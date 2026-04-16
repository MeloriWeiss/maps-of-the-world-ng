import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserResponseDto } from '@wm/shared/users';
import { AuthService } from '../../auth/services';
import { catchError, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  #http = inject(HttpClient);
  #authService = inject(AuthService);

  getMe() {
    return this.#http.get<UserResponseDto>('/api/users/me').pipe(
      tap(() => {
        this.#authService.isAuthorized$.next(true);
      }),
      catchError((error) => {
        this.#authService.isAuthorized$.next(false);
        return throwError(() => error);
      }),
    );
  }
}
