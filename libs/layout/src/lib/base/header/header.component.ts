import { ChangeDetectionStrategy, Component } from '@angular/core';
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
    RouterLinkActive
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  searchControl = new FormControl('');
}
