import { ViewportScroller } from '@angular/common';
import { afterNextRender, Directive, inject, input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/** Resolves a route fragment when its asynchronously loaded target appears. */
@Directive({
  selector: '[wmRouteAnchor]',
  standalone: true,
  host: { '[id]': 'wmRouteAnchor()' },
})
export class RouteAnchorDirective {
  readonly wmRouteAnchor = input.required<string>();
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #viewport = inject(ViewportScroller);

  constructor() {
    afterNextRender(() => {
      if (this.#router.lastSuccessfulNavigation?.trigger === 'popstate') return;
      const anchor = this.wmRouteAnchor();
      if (this.#route.snapshot.fragment === anchor) {
        this.#viewport.scrollToAnchor(anchor);
      }
    });
  }
}
