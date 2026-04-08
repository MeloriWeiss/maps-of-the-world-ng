import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  #http = inject(HttpClient);

  isAuthorized = false;

  login() {
    return this.#http.post<{ logged: boolean }>('/api/login', {}).pipe(
      tap((res) => {
        this.isAuthorized = res.logged;
      }),
    );
  }
}
