import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Renderer2,
  signal,
} from '@angular/core';
import { SearchInputComponent, SvgComponent } from '@wm/common-ui';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'wm-header',
  imports: [
    SearchInputComponent,
    SvgComponent,
    RouterLink,
    ReactiveFormsModule,
    RouterLinkActive,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
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
}
