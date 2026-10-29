import { ViewportScroller } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, Scroll } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Применяет общую политику прокрутки после навигации Angular Router.
 *
 * Переход назад восстанавливает сохранённую позицию, фрагмент прокручивает
 * к якорю, а обычный переход открывает начало страницы. Маршрут может включить
 * `preserveScrollOnQueryChange`, чтобы изменение query-параметров того же пути
 * сохраняло текущую позицию.
 *
 * Сервис создаётся один раз при запуске приложения. Встроенная прокрутка Router
 * должна быть отключена, при этом события Scroll должны оставаться включёнными.
 */
@Injectable({ providedIn: 'root' })
export class RouterScrollService {
  readonly #router = inject(Router);
  readonly #viewport = inject(ViewportScroller);
  #previousPath = '';

  constructor() {
    this.#viewport.setHistoryScrollRestoration('manual');

    this.#router.events
      .pipe(
        filter((event): event is Scroll => event instanceof Scroll),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        const url =
          event.routerEvent instanceof NavigationEnd
            ? event.routerEvent.urlAfterRedirects
            : event.routerEvent.url;
        const path = url.split(/[?#]/, 1)[0];

        let route = this.#router.routerState.snapshot.root;
        while (route.firstChild) route = route.firstChild;

        const preserve =
          path === this.#previousPath &&
          route.data['preserveScrollOnQueryChange'] === true;
        this.#previousPath = path;

        if (event.position) {
          this.#viewport.scrollToPosition(event.position);
          return;
        }

        if (event.anchor) {
          this.#viewport.scrollToAnchor(event.anchor);
          return;
        }

        if (!preserve) this.#viewport.scrollToPosition([0, 0]);
      });
  }
}
