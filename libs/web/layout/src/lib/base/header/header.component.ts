import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Renderer2,
  signal,
} from '@angular/core';
import {
  PopoverComponent,
  SearchInputComponent,
  SvgComponent,
} from '@wm/web/common-ui';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '@wm/web/data-access/auth';
import { firstValueFrom } from 'rxjs';
import { CurrentAccountStore } from '@wm/web/data-access/profile';
import { ThemeService } from '@wm/web/shared';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';

@Component({
  selector: 'wm-header',
  imports: [
    SearchInputComponent,
    SvgComponent,
    RouterLink,
    ReactiveFormsModule,
    RouterLinkActive,
    PopoverComponent,
  ],
  animations: [
    trigger('slideInOut', [
      state(
        'closed',
        style({
          transform: 'translateX(100%)',
        }),
      ),
      state(
        'open',
        style({
          transform: 'translateX(0)',
        }),
      ),
      transition(
        'closed <=> open',
        animate('0.4s cubic-bezier(0.25, 1, 0.5, 1)'),
      ),
    ]),
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  #authService = inject(AuthService);
  themeService = inject(ThemeService);

  readonly currentAccount = inject(CurrentAccountStore);

  searchControl = new FormControl('');

  readonly isAuthorized = toSignal(this.#authService.isAuthorized$, {
    requireSync: true,
  });

  isMenuOpen = signal<boolean>(false);

  r2 = inject(Renderer2);

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
    this.closeMenu();
    firstValueFrom(this.#authService.logout()).then();
  }

  changeTheme(theme: string) {
    this.themeService.setTheme(theme);
  }
}
