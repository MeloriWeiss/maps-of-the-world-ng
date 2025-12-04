import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { SvgComponent } from '../svg/svg.component';
import { PaginationService } from './pagination.service';

@Component({
  selector: 'wm-pagination',
  imports: [SvgComponent],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  #paginationService = inject(PaginationService);

  currentPage = this.#paginationService.currentPage;
  visiblePages = this.#paginationService.visiblePages;

  changePage(page: number | '...') {
    if (page === '...') return;

    this.#paginationService.changePage(page);
  }
}
