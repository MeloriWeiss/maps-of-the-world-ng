import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'svg[icon]',
  imports: [],
  template: '<svg:use [attr.href]="href"></svg:use>',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SvgComponent {
  @Input() icon = '';
  @Input() dir = '';

  get href() {
    return `/assets/svg/${this.dir + this.icon}.svg#${this.icon}`;
  }
}
