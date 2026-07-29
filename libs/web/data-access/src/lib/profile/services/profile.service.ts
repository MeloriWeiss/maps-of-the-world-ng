import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserResponseDto } from '@wm/shared/users';
import {
  AccountResponseDto,
  ProfileSummaryDto,
  UpdateAccountRequestDto,
} from '@wm/shared/accounts';
import { AuthService } from '../../auth/services';
import { catchError, Subject, tap, throwError } from 'rxjs';
import { API_CONFIG } from '../../shared';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  #http = inject(HttpClient);
  #authService = inject(AuthService);
  #apiConfig = inject(API_CONFIG);
  #profileChanged = new Subject<void>();

  readonly profileChanges$ = this.#profileChanged.asObservable();

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

  getProfileSummary(userId?: number) {
    const path =
      userId === undefined
        ? 'accounts/me/summary'
        : `accounts/profiles/${userId}`;
    return this.#http.get<ProfileSummaryDto>(
      `${this.#apiConfig.baseUrl}${path}`,
    );
  }

  getMyAccount() {
    return this.#http.get<AccountResponseDto>(
      `${this.#apiConfig.baseUrl}accounts/me`,
    );
  }

  updateMyAccount(account: UpdateAccountRequestDto) {
    return this.#http
      .patch<AccountResponseDto>(
        `${this.#apiConfig.baseUrl}accounts/me`,
        account,
      )
      .pipe(tap(() => this.#profileChanged.next()));
  }

  uploadAvatar(file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.#http
      .post<{
        avatarUrl: string;
      }>(`${this.#apiConfig.baseUrl}accounts/me/avatar`, body)
      .pipe(tap(() => this.#profileChanged.next()));
  }
}
