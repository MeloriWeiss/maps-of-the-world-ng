import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SvgComponent } from '@wm/common-ui';

@Component({
  selector: 'wm-forum-sidebar',
  imports: [RouterLinkActive, RouterLink, SvgComponent],
  templateUrl: './forum-sidebar.component.html',
  styleUrl: './forum-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumSidebarComponent {
  #router = inject(Router);
  isOpened = signal<boolean>(false);

  forums = [
    { link: 'maps', label: 'Карты', count: 122 },
    { link: 'tools', label: 'Инструменты', count: 4 },
    { link: 'texture-packs', label: 'Текстур-паки', count: 12 },
  ];

  getActiveLabel() {
    const active = this.forums.find((forum) =>
      this.#router.url.includes(forum.label),
    );
    return active ? active.label : 'Выберите форум...';
  }

  toggleMenu() {
    this.isOpened.set(!this.isOpened());
  }
}
