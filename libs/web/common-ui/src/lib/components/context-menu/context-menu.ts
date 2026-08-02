import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  Renderer2,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { ContextMenuService } from './context-menu.service';
import { ClickOutsideDirective } from '../../directives';
import { NgStyle, NgTemplateOutlet } from '@angular/common';
import { ContextMenuConfig } from '@wm/web/data-access/shared';

@Component({
  selector: 'wm-context-menu',
  imports: [ClickOutsideDirective, NgTemplateOutlet, NgStyle],
  templateUrl: './context-menu.html',
  styleUrl: './context-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextMenuComponent implements OnDestroy {
  #contextMenuService = inject(ContextMenuService);
  #r2 = inject(Renderer2);

  menuContainer = viewChild<ElementRef<HTMLDivElement>>('mainContainer');

  private config!: ContextMenuConfig;
  template: TemplateRef<any> | null = null;

  adjustedX = signal<number>(0);
  adjustedY = signal<number>(0);

  private lockedScrollTop = 0;
  private lockedScrollLeft = 0;
  private unlisteners: (() => void)[] = [];

  constructor() {
    afterRenderEffect(() => this.calculatePosition());
  }

  initData(config: ContextMenuConfig, template: TemplateRef<any>) {
    this.config = config;
    this.template = template;
    this.lockScroll();
    this.listenResize();
  }

  calculatePosition() {
    const element = this.menuContainer()?.nativeElement;

    if (!element) return;

    const menuWidth = element.offsetWidth;
    const menuHeight = element.offsetHeight;

    const windowWidth = document.documentElement.clientWidth;
    const windowHeight = document.documentElement.clientHeight;

    let targetX = 0;
    let targetY = 0;

    const offsetX = this.config.offset?.x ?? 0;
    const offsetY =
      this.config.offset?.y ?? (this.config.mode === 'static' ? 4 : 0);

    if (this.config.mode === 'dynamic') {
      targetX = this.config.event.clientX + offsetX;
      targetY = this.config.event.clientY + offsetY;
    } else if (this.config.mode === 'static') {
      const rect = this.config.anchorElement.getBoundingClientRect();
      targetX = rect.left + offsetX;
      targetY = rect.bottom + offsetY;
    }

    if (targetX + menuWidth > windowWidth) {
      if (this.config.mode === 'dynamic') targetX -= menuWidth - offsetX;
      else {
        const rect = this.config.anchorElement.getBoundingClientRect();
        targetX = rect.right - menuWidth - offsetX;
      }
    }

    if (targetY + menuHeight > windowHeight) {
      if (this.config.mode === 'dynamic') targetY -= menuHeight - offsetY;
      else if (this.config.anchorElement) {
        const rect = this.config.anchorElement.getBoundingClientRect();
        targetY = rect.top - menuHeight - offsetY;
      }
    }

    this.adjustedX.set(targetX);
    this.adjustedY.set(targetY);
  }

  private lockScroll() {
    this.lockedScrollTop = window.scrollY || document.documentElement.scrollTop;
    this.lockedScrollLeft =
      window.scrollX || document.documentElement.scrollLeft;

    const unwheel = this.#r2.listen(
      window,
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
      },
      { passive: false },
    );
    this.unlisteners.push(unwheel);

    const unscroll = this.#r2.listen(window, 'scroll', () => {
      window.scrollTo(this.lockedScrollLeft, this.lockedScrollTop);
    });
    this.unlisteners.push(unscroll);
  }

  private listenResize() {
    if (this.config.mode === 'static') {
      const resizeHandler = () => {
        this.calculatePosition();
      };

      window.addEventListener('resize', resizeHandler);

      this.unlisteners.push(() =>
        window.removeEventListener('resize', resizeHandler),
      );
    }
  }

  onClose() {
    this.#contextMenuService.close();
  }

  ngOnDestroy() {
    this.unlisteners.forEach((unlisten) => unlisten());
  }
}
