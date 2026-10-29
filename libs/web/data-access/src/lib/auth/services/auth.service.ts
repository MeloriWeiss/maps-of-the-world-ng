import type { ChangePasswordData } from '../interfaces';
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { GetSessionsDto } from '@wm/shared/auth';
import { UserResponseDto } from '@wm/shared/users';
import { LoginData, RegisterData } from '../interfaces';
import { DefaultResponseDto } from '@wm/shared/common';
import { Router } from '@angular/router';
import { API_CONFIG, BYPASS_GLOBAL_ERROR } from '../../shared';
import { CurrentAccountStore } from '../../profile';

/** Выполняет операции авторизации, управления аккаунтом и сеансами. */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  #http = inject(HttpClient);
  #router = inject(Router);
  #apiConfig = inject(API_CONFIG);
  #currentAccountStore = inject(CurrentAccountStore);

  isAuthorized$ = new BehaviorSubject(false);

  /** Создаёт аккаунт и сохраняет пользователя в общем состоянии авторизации. */
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

  /** Авторизует пользователя и сохраняет полученные данные аккаунта. */
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

  /** Обновляет серверный сеанс по действующей refresh-cookie. */
  refresh() {
    return this.#http
      .post<DefaultResponseDto>(
        `${this.#apiConfig.baseUrl}auth/refresh`,
        {},
        { context: new HttpContext().set(BYPASS_GLOBAL_ERROR, true) },
      )
      .pipe(tap(() => this.isAuthorized$.next(true)));
  }

  /** Завершает текущий сеанс и очищает состояние пользователя. */
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

  /** Завершает все сеансы аккаунта и очищает состояние пользователя. */
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

  /** Загружает список сеансов, доступный текущему аккаунту. */
  getSessions() {
    return this.#http.get<GetSessionsDto>(
      `${this.#apiConfig.baseUrl}auth/sessions`,
      {
        context: new HttpContext().set(BYPASS_GLOBAL_ERROR, true),
      },
    );
  }

  /** Отправляет текущий и новый пароль на сервер. */
  changePassword(data: ChangePasswordData) {
    return this.#http.put<DefaultResponseDto>(
      `${this.#apiConfig.baseUrl}auth/password`,
      data,
      {
        context: new HttpContext().set(BYPASS_GLOBAL_ERROR, true),
      },
    );
  }

  /** Завершает выбранный сеанс и при необходимости очищает текущий. */
  endSession(id: number, isCurrent: boolean) {
    return this.#http
      .delete<DefaultResponseDto>(
        `${this.#apiConfig.baseUrl}auth/sessions/${id}`,
        {
          context: new HttpContext().set(BYPASS_GLOBAL_ERROR, true),
        },
      )
      .pipe(
        tap(() => {
          if (isCurrent) this.clearSession();
        }),
      );
  }

  /** Сбрасывает локальную авторизацию и переводит пользователя на вход. */
  clearSession() {
    this.isAuthorized$.next(false);
    this.#currentAccountStore.clear();
    this.#router.navigate(['/login']).then();
  }

  /** Восстанавливает пользователя по сохранённому серверному сеансу. */
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
