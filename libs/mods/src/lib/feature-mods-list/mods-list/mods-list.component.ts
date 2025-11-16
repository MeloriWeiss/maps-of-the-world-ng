import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  DeskListComponent,
  PaginationService,
  SearchInputComponent,
  SvgComponent,
} from '@wm/common-ui';
import { MockService } from '@wm/data-access/mock/mock.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
} from '@angular/router';
import { debounceTime, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { ModeCardComponent } from './mode-card/mode-card.component';
import { CarouselModule } from 'ngx-owl-carousel-o';
import { ModsListSidebarComponent } from './mods-list-sidebar/mods-list-sidebar.component';

@Component({
  selector: 'wm-mods-list',
  imports: [
    DeskListComponent,
    SearchInputComponent,
    SvgComponent,
    ReactiveFormsModule,
    AsyncPipe,
    ModeCardComponent,
    CarouselModule,
    ModsListSidebarComponent,
  ],
  templateUrl: './mods-list.component.html',
  styleUrl: './mods-list.component.scss',
  providers: [PaginationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModsListComponent {
  #activatedRoute = inject(ActivatedRoute);
  #router = inject(Router);
  #mockService = inject(MockService);
  #paginationService = inject(PaginationService);

  searchControl = new FormControl('');

  mods$ = this.#activatedRoute.queryParams.pipe(
    switchMap(({ page, search }) => {
      this.#paginationService.currentPage.set(page ? +page : 1);

      return this.#mockService
        .getMods({
          page: page ? page : 1,
          search: search ? search : undefined,
        })
        .pipe(tap((mods) => this.#paginationService.maxPage.set(2)));
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
