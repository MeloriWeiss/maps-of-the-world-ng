import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ContentChild,
  ElementRef,
  inject,
  input,
  OnDestroy,
  signal,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

export interface VirtualListItemContext<T> {
  $implicit: T;
  index: number;
}

interface VisibleItem<T> {
  item: T;
  index: number;
}

@Component({
  selector: 'wm-virtual-list',
  imports: [NgTemplateOutlet],
  templateUrl: './virtual-list.component.html',
  styleUrl: './virtual-list.component.scss',
  host: {
    '(scroll)': 'onScroll($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VirtualListComponent<T> implements AfterViewInit, OnDestroy {
  #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  #scrollTop = signal(0);
  #viewportHeight = signal(0);
  #resizeObserver?: ResizeObserver;

  items = input.required<readonly T[]>();
  itemHeight = input(32);
  overscan = input(5);

  @ContentChild(TemplateRef)
  itemTemplate: TemplateRef<VirtualListItemContext<T>> | null = null;

  totalHeight = computed(() => this.items().length * this.itemHeight());

  visibleItems = computed<VisibleItem<T>[]>(() => {
    const itemHeight = this.itemHeight();
    const overscan = this.overscan();
    const start = Math.max(
      0,
      Math.floor(this.#scrollTop() / itemHeight) - overscan,
    );
    const end = Math.min(
      this.items().length,
      Math.ceil((this.#scrollTop() + this.#viewportHeight()) / itemHeight) +
        overscan,
    );

    return this.items()
      .slice(start, end)
      .map((item, offset) => ({ item, index: start + offset }));
  });

  offset = computed(() => {
    const firstItem = this.visibleItems()[0];
    return (firstItem?.index ?? 0) * this.itemHeight();
  });

  ngAfterViewInit(): void {
    this.#resizeObserver = new ResizeObserver(([entry]) => {
      this.#viewportHeight.set(entry.contentRect.height);
    });
    this.#resizeObserver.observe(this.#elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.#resizeObserver?.disconnect();
  }

  onScroll(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    this.#scrollTop.set(target.scrollTop);
  }
}
