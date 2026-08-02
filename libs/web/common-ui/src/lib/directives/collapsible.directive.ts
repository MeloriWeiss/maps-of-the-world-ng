import {
  AfterViewInit,
  Directive,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  OnDestroy,
  Renderer2,
} from '@angular/core';

@Directive({
  selector: '[wmCollapsible]',
})
export class CollapsibleDirective implements AfterViewInit, OnDestroy {
  #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  #r2 = inject(Renderer2);
  #injector = inject(Injector);
  #stopListeningToResize: (() => void) | null = null;

  isOpened = input(false);

  ngAfterViewInit() {
    const element = this.#elementRef.nativeElement;

    this.#r2.setStyle(element, 'transition', 'height .3s ease');
    this.#r2.setStyle(element, 'overflow', 'hidden');

    effect(
      () => {
        this.#syncHeight();
      },
      { injector: this.#injector },
    );

    this.#stopListeningToResize = this.#r2.listen('window', 'resize', () =>
      this.#syncHeight(),
    );
  }

  #syncHeight() {
    const element = this.#elementRef.nativeElement;
    const nextHeight = this.isOpened() ? `${element.scrollHeight}px` : '0px';
    this.#r2.setStyle(element, 'height', nextHeight);
  }

  ngOnDestroy() {
    this.#stopListeningToResize?.();
  }
}
