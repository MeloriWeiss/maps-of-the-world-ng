import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PaginationComponent, SearchInputComponent, SvgComponent } from '@wm/common-ui';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DiscussionCardComponent } from './discussion-card/discussion-card.component';
import { MockService } from '@wm/data-access/mock/mock.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'wm-forum-page',
  imports: [
    SearchInputComponent,
    ReactiveFormsModule,
    SvgComponent,
    PaginationComponent,
    DiscussionCardComponent,
    AsyncPipe,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './forum-page.component.html',
  styleUrl: './forum-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForumPageComponent {
  #mockService = inject(MockService);

  discussions$ = this.#mockService.getDiscussions();

  searchControl = new FormControl('');
}
