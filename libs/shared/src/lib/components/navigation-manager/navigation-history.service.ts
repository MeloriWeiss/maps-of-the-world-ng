import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NavigationHistoryService {
  #router = inject(Router);
  #history: string[] = [];
  #historyMaxLength = 5;

  routerEvents$ = this.#router.events.pipe(
    tap((event) => {
      if (event instanceof NavigationEnd) {
        this.#history.push(event.urlAfterRedirects);

        if (this.#history.length > this.#historyMaxLength) {
          this.#history.shift();
        }
      }
    })
  );

  hasPrevRoutes() {
    return this.#history.length > 1;
  }
}
