import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly routerLink?: string | unknown[];
}

@Component({
  selector: 'wm-tabs',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
  readonly tabs = input.required<readonly TabItem[]>();
  readonly activeTab = input<string | null>(null);
  readonly ariaLabel = input('Разделы');
  readonly tabChange = output<string>();

  selectTab(id: string) {
    this.tabChange.emit(id);
  }
}
