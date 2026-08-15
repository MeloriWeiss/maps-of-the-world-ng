import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AdminAuditViewModel,
  presentAdminAuditEntry,
} from './audit-entry.presenter';
import { AdminAuditAction, AdminAuditTargetType } from './admin.models';
import { AdminService } from './admin.service';
import {
  DatePipe,
  LowerCasePipe,
  SlicePipe,
  UpperCasePipe,
} from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  PaginationComponent,
  PaginationService,
  SelectComponent,
  SelectOptionComponent,
} from '@wm/web/common-ui';

@Component({
  selector: 'wm-admin-audit',
  imports: [
    DatePipe,
    PaginationComponent,
    ReactiveFormsModule,
    SelectComponent,
    SelectOptionComponent,
    SlicePipe,
    LowerCasePipe,
    UpperCasePipe,
  ],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PaginationService],
})
export class AuditComponent {
  readonly #adminService = inject(AdminService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #formBuilder = inject(NonNullableFormBuilder);
  readonly #paginationService = inject(PaginationService);
  readonly items = signal<AdminAuditViewModel[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly filtersForm = this.#formBuilder.group({
    actor: '',
    action: this.#formBuilder.control<AdminAuditAction | ''>(''),
    targetType: this.#formBuilder.control<AdminAuditTargetType | ''>(''),
    targetId: '',
    from: '',
    to: '',
  });

  constructor() {
    this.#route.queryParamMap
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((params) => {
        const page = Math.max(1, Number(params.get('page')) || 1);
        this.filtersForm.setValue(
          {
            actor: params.get('actor') ?? '',
            action: this.#parseAction(params.get('action')),
            targetType: this.#parseTargetType(params.get('targetType')),
            targetId: params.get('targetId') ?? '',
            from: params.get('from') ?? '',
            to: params.get('to') ?? '',
          },
          { emitEvent: false },
        );
        this.page.set(page);
        this.#paginationService.currentPage.set(page);
        this.load();
      });
  }

  load() {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.#adminService
      .getAudit(this.page(), this.filtersForm.getRawValue())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (result) => {
          this.items.set(result.items.map(presentAdminAuditEntry));
          this.total.set(result.total);
          this.#paginationService.maxPage.set(
            Math.max(1, Math.ceil(result.total / result.pageSize)),
          );
          this.isLoading.set(false);
        },
        error: () => {
          this.loadError.set('Не удалось загрузить журнал действий.');
          this.isLoading.set(false);
        },
      });
  }

  applyFilters() {
    const filters = this.filtersForm.getRawValue();
    void this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: {
        page: 1,
        actor: filters.actor.trim() || null,
        action: filters.action || null,
        targetType: filters.targetType || null,
        targetId: filters.targetId.trim() || null,
        from: filters.from || null,
        to: filters.to || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  resetFilters() {
    this.filtersForm.reset();
    this.applyFilters();
  }

  selectAction(value: string) {
    this.filtersForm.controls.action.setValue(this.#parseAction(value));
  }

  selectTargetType(value: string) {
    this.filtersForm.controls.targetType.setValue(this.#parseTargetType(value));
  }

  #parseAction(value: string | null): AdminAuditAction | '' {
    if (
      value === 'USER_ROLE_CHANGED' ||
      value === 'USER_STATUS_CHANGED' ||
      value === 'CONTENT_VISIBILITY_CHANGED'
    )
      return value;
    return '';
  }

  #parseTargetType(value: string | null): AdminAuditTargetType | '' {
    if (
      value === 'USER' ||
      value === 'MAP' ||
      value === 'TEXTURE_PACK' ||
      value === 'FORUM_DISCUSSION'
    )
      return value;
    return '';
  }
}
