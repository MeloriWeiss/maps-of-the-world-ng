import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
  DeskListComponent,
  PaginationService,
  SearchInputComponent,
  SvgComponent,
} from '@wm/common-ui';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { MockService } from '@wm/data-access/mock/mock.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DiscussionCardComponent } from './discussion-card/discussion-card.component';
import { debounceTime, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'wm-forum-discussions-list',
  imports: [
    AsyncPipe,
    DeskListComponent,
    DiscussionCardComponent,
    RouterLinkActive,
    SearchInputComponent,
    SvgComponent,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './forum-discussions-list.component.html',
  styleUrl: './forum-discussions-list.component.scss',
  providers: [PaginationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumDiscussionsListComponent {
  #activatedRoute = inject(ActivatedRoute);
  #router = inject(Router);
  #mockService = inject(MockService);
  #paginationService = inject(PaginationService);

  searchControl = new FormControl('');

  discussions$ = this.#activatedRoute.queryParams.pipe(
    switchMap(({ page, search }) => {
      this.#paginationService.currentPage.set(page ? +page : 1);

      return this.#mockService
        .getDiscussions({
          page: page ? page : 1,
          search: search ? search : undefined,
        })
        .pipe(tap((discussions) => this.#paginationService.maxPage.set(2)));
    })
  );

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(500), takeUntilDestroyed())
      .subscribe((value) => {
        this.#router
          .navigate([], {
            relativeTo: this.#activatedRoute,
            queryParams: {
              search: value ? value : undefined,
              page: 1,
            },
            queryParamsHandling: 'merge',
          })
          .then();
      });
  }
}
