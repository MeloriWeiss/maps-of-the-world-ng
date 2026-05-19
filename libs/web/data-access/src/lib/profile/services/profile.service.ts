import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserResponseDto } from '@wm/shared/users';
import { AuthService } from '../../auth/services';
import { catchError, tap, throwError } from 'rxjs';
import { API_CONFIG } from '../../shared';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  #http = inject(HttpClient);
  #authService = inject(AuthService);
  #apiConfig = inject(API_CONFIG);

  getMe() {
    return this.#http
      .get<UserResponseDto>(`${this.#apiConfig.baseUrl}users/me`)
      .pipe(
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
