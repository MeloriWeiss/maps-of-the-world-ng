import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { UserResponseDto } from '@wm/shared/users';
import { LoginData, RegisterData } from '../interfaces';
import { DefaultResponseDto } from '@wm/shared/common';
import { Router } from '@angular/router';
import { API_CONFIG, BYPASS_GLOBAL_ERROR } from '../../shared';
import { CurrentAccountStore } from '../../profile';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  #http = inject(HttpClient);
  #router = inject(Router);
  #apiConfig = inject(API_CONFIG);
  #currentAccountStore = inject(CurrentAccountStore);

  isAuthorized$ = new BehaviorSubject(false);

  register(data: RegisterData) {
    return this.#http
      .post<UserResponseDto>(`${this.#apiConfig.baseUrl}auth/register`, data)
      .pipe(
        tap((user) => {
          this.isAuthorized$.next(true);
          this.#currentAccountStore.authenticate(user);
        }),
      );
  }

  login(data: LoginData) {
    return this.#http
      .post<UserResponseDto>(`${this.#apiConfig.baseUrl}auth/login`, data)
      .pipe(
        tap((user) => {
          this.isAuthorized$.next(true);
          this.#currentAccountStore.authenticate(user);
        }),
      );
  }

  refresh() {
    return this.#http
      .post<UserResponseDto>(
        `${this.#apiConfig.baseUrl}auth/refresh`,
        {},
        { context: new HttpContext().set(BYPASS_GLOBAL_ERROR, true) },
      )
      .pipe(
        tap((user) => {
          this.isAuthorized$.next(true);
          this.#currentAccountStore.authenticate(user);
        }),
      );
  }

  logout() {
    return this.#http
      .post<DefaultResponseDto>(
        `${this.#apiConfig.baseUrl}auth/logout`,
        {},
        { context: new HttpContext().set(BYPASS_GLOBAL_ERROR, true) },
      )
      .pipe(
        tap(() => {
          this.isAuthorized$.next(false);
          this.#currentAccountStore.clear();
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
          this.#currentAccountStore.clear();
          this.#router.navigate(['login']).then();
        }),
      );
  }

  getSessions() {
    return this.#http.get<unknown>(`${this.#apiConfig.baseUrl}auth/sessions`);
  }

  restoreSession() {
    return this.#http
      .get<UserResponseDto>(`${this.#apiConfig.baseUrl}users/me`)
      .pipe(
        tap({
          next: (user) => {
            this.isAuthorized$.next(true);
            this.#currentAccountStore.authenticate(user);
          },
          error: () => {
            this.isAuthorized$.next(false);
            this.#currentAccountStore.clear();
          },
        }),
      );
  }
}
