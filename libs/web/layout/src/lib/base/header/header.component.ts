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
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  #authService = inject(AuthService);

  searchControl = new FormControl('');

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
}
