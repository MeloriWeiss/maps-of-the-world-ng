import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from '@wm/web/shared';

@Component({
  selector: 'wm-admin-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPageComponent {
  themeService = inject(ThemeService);

  changeTheme(theme: string) {
    this.themeService.setTheme(theme);
  }
}
