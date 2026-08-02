import {
  AfterViewInit,
  Directive,
  ElementRef,
  inject,
  OnDestroy,
  output,
} from '@angular/core';
import { filter, fromEvent, Subscription } from 'rxjs';

@Directive({
  selector: '[wmClickOutside]',
  standalone: true,
})
export class ClickOutsideDirective implements AfterViewInit, OnDestroy {
  #element = inject(ElementRef);

  clickOutside = output<void>();

  documentClickSub: Subscription | null = null;

  ngAfterViewInit() {
    this.documentClickSub = fromEvent(document, 'click')
      .pipe(
        filter((event) => !this.isClickedInside(event.target as HTMLElement)),
      )
      .subscribe(() => this.clickOutside.emit());
  }

  isClickedInside(elementClicked: HTMLElement): boolean {
    return (
      elementClicked === this.#element.nativeElement ||
      this.#element.nativeElement.contains(elementClicked)
    );
  }

  ngOnDestroy() {
    this.documentClickSub?.unsubscribe();
  }
}
