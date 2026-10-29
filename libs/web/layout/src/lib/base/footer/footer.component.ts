import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SvgComponent } from '@wm/web/common-ui';

/** Подвал сайта с дополнительными ссылками и сведениями о проекте. */
@Component({
  selector: 'wm-footer',
  imports: [RouterLink, SvgComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {}
