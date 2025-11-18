import {
  AfterViewInit,
  Directive,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  Renderer2,
} from '@angular/core';

@Directive({
  selector: '[wmCollapsible]',
})
export class CollapsibleDirective implements AfterViewInit {
  #elementRef = inject(ElementRef);
  #r2 = inject(Renderer2);
  #injector = inject(Injector);

  isOpened = input(false);

  ngAfterViewInit() {
    const element: HTMLElement = this.#elementRef.nativeElement;
    let height = element.offsetHeight;

    this.#r2.setStyle(element, 'transition', 'height .3s ease');
    this.#r2.setStyle(element, 'overflow', 'hidden');

    effect(
      () => {
        if (this.isOpened()) {
          this.#r2.setStyle(element, 'height', height + 'px');
          return;
        }

        height = element.offsetHeight;
        this.#r2.setStyle(element, 'height', 0);
      },
      { injector: this.#injector }
    );
  }
}
