import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { UserResponseDto } from '@wm/shared/users';
import { LoginData, RegisterData } from '../interfaces';
import { DefaultResponseDto } from '@wm/shared/common';
import { Router } from '@angular/router';
import { API_CONFIG } from '../../shared';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  #http = inject(HttpClient);
  #router = inject(Router);
  #apiConfig = inject(API_CONFIG);

  isAuthorized$ = new BehaviorSubject(false);

  register(data: RegisterData) {
    return this.#http
      .post<UserResponseDto>(`${this.#apiConfig.baseUrl}auth/register`, data)
      .pipe(
        tap(() => {
          this.isAuthorized$.next(true);
        }),
      );
  }

  login(data: LoginData) {
    return this.#http
      .post<UserResponseDto>(`${this.#apiConfig.baseUrl}auth/login`, data)
      .pipe(
        tap(() => {
          this.isAuthorized$.next(true);
        }),
      );
  }

  refresh() {
    return this.#http
      .post<UserResponseDto>(`${this.#apiConfig.baseUrl}auth/refresh`, {})
      .pipe(
        tap(() => {
          this.isAuthorized$.next(true);
        }),
      );
  }

  logout() {
    return this.#http
      .post<DefaultResponseDto>(`${this.#apiConfig.baseUrl}auth/logout`, {})
      .pipe(
        tap(() => {
          this.isAuthorized$.next(false);
          this.#router.navigate(['login']).then();
        }),
      );
  }

  logoutAll() {
    return this.#http
      .post<DefaultResponseDto>(`${this.#apiConfig.baseUrl}auth/logout-all`, {})
      .pipe(
        tap(() => {
          this.isAuthorized$.next(false);
          this.#router.navigate(['login']).then();
        }),
      );
  }

  getSessions() {
    return this.#http.get<unknown>(`${this.#apiConfig.baseUrl}auth/sessions`);
  }
}
