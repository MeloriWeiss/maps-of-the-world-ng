import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { UserResponseDto } from '@wm/shared/users';
import { LoginData, RegisterData } from '../interfaces';
import { DefaultResponseDto } from '@wm/shared/common';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  #http = inject(HttpClient);
  #router = inject(Router);

  isAuthorized$ = new BehaviorSubject(false);

  register(data: RegisterData) {
    return this.#http.post<UserResponseDto>('/api/auth/register', data).pipe(
      tap(() => {
        this.isAuthorized$.next(true);
      }),
    );
  }

  login(data: LoginData) {
    return this.#http.post<UserResponseDto>('/api/auth/login', data).pipe(
      tap(() => {
        this.isAuthorized$.next(true);
      }),
    );
  }

  refresh() {
    return this.#http.post<UserResponseDto>('/api/auth/refresh', {}).pipe(
      tap(() => {
        this.isAuthorized$.next(true);
      }),
    );
  }

  logout() {
    return this.#http.post<DefaultResponseDto>('/api/auth/logout', {}).pipe(
      tap(() => {
        this.isAuthorized$.next(false);
        this.#router.navigate(['login']).then();
      }),
    );
  }

  logoutAll() {
    return this.#http.post<DefaultResponseDto>('/api/auth/logout-all', {}).pipe(
      tap(() => {
        this.isAuthorized$.next(false);
        this.#router.navigate(['login']).then();
      }),
    );
  }

  getSessions() {
    return this.#http.get<unknown>('/api/auth/sessions');
  }
}
