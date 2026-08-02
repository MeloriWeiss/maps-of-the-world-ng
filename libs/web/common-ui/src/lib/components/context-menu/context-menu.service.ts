import {
  ComponentRef,
  Injectable,
  signal,
  TemplateRef,
  Type,
  ViewContainerRef,
} from '@angular/core';
import { ContextMenuComponent } from './context-menu';
import { ContextMenuConfig } from '@wm/web/data-access/shared';

@Injectable({ providedIn: 'root' })
export class ContextMenuService {
  #container?: ViewContainerRef;
  #currentMenuRef: ComponentRef<ContextMenuComponent> | null = null;

  private isOpened = signal<boolean>(false);

  registerContainer(vcr: ViewContainerRef) {
    this.#container = vcr;
  }

  open(
    contextMenuComponent: Type<ContextMenuComponent>,
    content: TemplateRef<any>,
    config: ContextMenuConfig,
  ) {
    if (!this.#container) return null;

    if (this.isOpened()) {
      this.close();
      return null;
    }

    this.#currentMenuRef =
      this.#container.createComponent(contextMenuComponent);

    const instance = this.#currentMenuRef.instance;

    instance.initData(config, content);
    this.#currentMenuRef.changeDetectorRef.markForCheck();

    this.isOpened.set(true);

    return instance;
  }

  close() {
    if (this.#currentMenuRef) {
      this.#currentMenuRef.destroy();
      this.#currentMenuRef = null;
      this.isOpened.set(false);
    }
  }
}
