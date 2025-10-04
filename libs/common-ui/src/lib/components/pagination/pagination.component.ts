import { ChangeDetectionStrategy, Component, computed, effect, input, OnInit, signal } from '@angular/core';
import { SvgComponent } from '../svg/svg.component';

@Component({
  selector: 'wm-pagination',
  imports: [
    SvgComponent
  ],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginationComponent {
  currentPage = input.required<number>();
  maxPage = input.required<number>();

  pagesList = computed(() => {
    const result = [];
    for (let i = 1; i <= this.maxPage(); i++) {
      result.push(i);
    }
    return result;
  });
  visiblePages = signal<Array<number | '...'>>([]);

  constructor() {
    effect(() => {
      const currentPage = this.currentPage();
      const maxPage = this.maxPage();
      const pagesList = this.pagesList();

      this.visiblePages.set(this.calculateVisiblePages(currentPage, maxPage, pagesList));
    });
  }

  calculateVisiblePages(currentPage: number, maxPage: number, pagesList: number[]): Array<number | '...'> {
    const dots = '...';

    if (maxPage < 5) {
      return pagesList;
    }
    if (currentPage === 1 || currentPage === 2) {
      return [1, 2, 3, dots, maxPage];
    }
    if (currentPage > 2) {
      if (currentPage === maxPage || currentPage === maxPage - 1) {
        return [1, dots, maxPage - 2, maxPage - 1, maxPage];
      }
      return [1, dots, currentPage - 1, currentPage, currentPage + 1, dots, maxPage];
    }
    return [];
  }
}
