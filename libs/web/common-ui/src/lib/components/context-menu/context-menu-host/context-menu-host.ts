import {
  ChangeDetectionStrategy,
  Component,
  inject,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { ContextMenuService } from '../context-menu.service';

@Component({
  selector: 'wm-context-menu-host',
  imports: [],
  templateUrl: './context-menu-host.html',
  styleUrl: './context-menu-host.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextMenuHostComponent {
  #contextMenuService = inject(ContextMenuService);

  @ViewChild('contextMenuHost', { read: ViewContainerRef })
  set contextMenuHost(contextMenuHost: ViewContainerRef) {
    if (!contextMenuHost) return;

    this.#contextMenuService.registerContainer(contextMenuHost);
  }
}
