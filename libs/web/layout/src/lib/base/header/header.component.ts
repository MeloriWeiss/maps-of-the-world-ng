import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Renderer2,
  Signal,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import {
  ContextMenuTriggerDirective,
  SearchInputComponent,
  SvgComponent,
} from '@wm/web/common-ui';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '@wm/web/data-access/auth';
import { firstValueFrom } from 'rxjs';
import { ContextMenuOption } from '@wm/web/data-access/shared';
import { ContextMenuItemComponent } from '@wm/web/common-ui';

@Component({
  selector: 'wm-header',
  imports: [
    SearchInputComponent,
    SvgComponent,
    RouterLink,
    ReactiveFormsModule,
    RouterLinkActive,
    ContextMenuTriggerDirective,
    ContextMenuItemComponent,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  #authService = inject(AuthService);
  #router = inject(Router);

  r2 = inject(Renderer2);

  searchControl = new FormControl('');

  isMenuOpen = signal<boolean>(false);

  contextMenuTemplate: Signal<TemplateRef<any> | undefined> = viewChild(
    'contextMenuTemplate',
  );

  toggleMenu() {
    this.isMenuOpen.set(!this.isMenuOpen());

    if (this.isMenuOpen()) this.r2.addClass(document.body, 'no-scroll');
    else this.r2.removeClass(document.body, 'no-scroll');
  }

  closeMenu() {
    this.isMenuOpen.set(false);
    this.r2.removeClass(document.body, 'no-scroll');
  }

  logout() {
    firstValueFrom(this.#authService.logout()).then();
  }

  menuOptions: ContextMenuOption[] = [
    {
      label: 'Вставить',
      extra: 'Ctrl + V',
      disabled: true,
      action: () => console.log('Вставили'),
    },
    {
      label: 'Удалить',
      icon: 'share',
      extra: 'Del',
      action: () => console.log('DELETE'),
    },
    {
      label: 'Профиль',
      icon: 'avatar',
      action: () => this.navigateToProfile(),
    },
  ];

  private navigateToProfile() {
    this.#router.navigate(['profile', 'me']).then();
  }
}
