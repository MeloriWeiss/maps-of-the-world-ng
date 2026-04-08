import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  DiscussionCardComponent,
  MapCardComponent,
  ModeCardComponent,
  SvgComponent,
} from '@wm/common-ui';
import { RouterLink } from '@angular/router';
import { MockService } from '@wm/data-access/mock';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'wm-home-page',
  imports: [
    SvgComponent,
    RouterLink,
    MapCardComponent,
    ModeCardComponent,
    AsyncPipe,
    DiscussionCardComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  #mockService = inject(MockService);

  modes = this.#mockService.getModsData();
  discussions = this.#mockService.getDiscussions({ page: 1, search: '' });
}
