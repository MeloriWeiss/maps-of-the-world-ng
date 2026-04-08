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
  #elementRef = inject(ElementRef);
  #r2 = inject(Renderer2);
  #injector = inject(Injector);

  isOpened = input(false);

  private onResize = () => this.syncHeight();

  ngAfterViewInit() {
    const element = this.#elementRef.nativeElement;

    this.#r2.setStyle(element, 'transition', 'height .3s ease');
    this.#r2.setStyle(element, 'overflow', 'hidden');

    effect(
      () => {
        this.syncHeight();
      },
      { injector: this.#injector }
    );

    window.addEventListener('resize', this.onResize);
  }

  private syncHeight() {
    const element: HTMLElement = this.#elementRef.nativeElement;
    const nextHeight = this.isOpened() ? `${element.scrollHeight}px` : '0px';
    this.#r2.setStyle(element, 'height', nextHeight);
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onResize);
  }
}
