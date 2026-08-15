import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Renderer2,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { UserRole, UserStatus } from '@wm/shared/users';
import { CurrentAccountStore } from '@wm/web/data-access/profile';
import { AdminUserDto } from './admin.models';
import { AdminService } from './admin.service';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ConfirmationModalComponent,
  ModalService,
  PaginationComponent,
  PaginationService,
} from '@wm/web/common-ui';
import { filter, finalize, switchMap, tap } from 'rxjs';

@Component({
  selector: 'wm-admin-users',
  imports: [FormsModule, DatePipe, PaginationComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PaginationService],
})
export class UsersComponent {
  readonly #adminService = inject(AdminService);
  readonly #currentAccountStore = inject(CurrentAccountStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #paginationService = inject(PaginationService);
  readonly #modalService = inject(ModalService);
  readonly #r2 = inject(Renderer2);
  readonly users = signal<AdminUserDto[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly pendingUserId = signal<number | null>(null);
  readonly isSuperAdmin = signal(
    this.#currentAccountStore.user()?.role === UserRole.superAdmin,
  );
  search = '';

  constructor() {
    this.#route.queryParamMap
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((params) => {
        const page = Math.max(1, Number(params.get('page')) || 1);
        this.page.set(page);
        this.#paginationService.currentPage.set(page);
        this.loadUsers();
      });
  }

  loadUsers() {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.#adminService
      .getUsers(this.search, this.page())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (page) => {
          this.users.set(page.items);
          this.total.set(page.total);
          this.#paginationService.maxPage.set(
            Math.max(1, Math.ceil(page.total / page.pageSize)),
          );
          this.isLoading.set(false);
        },
        error: () => {
          this.loadError.set('Не удалось загрузить пользователей.');
          this.isLoading.set(false);
        },
      });
  }

  searchUsers() {
    if (this.page() === 1) {
      this.loadUsers();
      return;
    }
    this.page.set(1);
    void this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { page: 1 },
      queryParamsHandling: 'merge',
    });
  }

  grantAdmin(user: AdminUserDto) {
    this.#updateRole(user, UserRole.admin);
  }

  revokeAdmin(user: AdminUserDto) {
    this.#updateRole(user, UserRole.user);
  }

  toggleStatus(user: AdminUserDto) {
    if (this.pendingUserId() !== null) return;
    const status =
      user.status === UserStatus.active
        ? UserStatus.blocked
        : UserStatus.active;

    this.actionError.set(null);
    this.pendingUserId.set(user.id);
    this.#r2.addClass(document.body, 'no-scroll');
    this.#modalService
      .show<boolean>(ConfirmationModalComponent, {
        title:
          status === UserStatus.blocked
            ? 'Заблокировать пользователя?'
            : 'Разблокировать пользователя?',
        subtitle: `${user.username} · ${user.email}`,
        agreeBtnText:
          status === UserStatus.blocked ? 'Заблокировать' : 'Разблокировать',
        rejectBtnText: 'Отмена',
      })
      .pipe(
        tap(() => this.#r2.removeClass(document.body, 'no-scroll')),
        filter((confirmed) => confirmed === true),
        switchMap(() => this.#adminService.updateStatus(user.id, status)),
        finalize(() => this.pendingUserId.set(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => this.#replaceUser(user.id, { status }),
        error: () =>
          this.actionError.set('Не удалось изменить статус пользователя.'),
      });
  }

  #updateRole(user: AdminUserDto, role: 'USER' | 'ADMIN') {
    if (this.pendingUserId() !== null) return;
    this.actionError.set(null);
    this.pendingUserId.set(user.id);
    this.#r2.addClass(document.body, 'no-scroll');

    this.#modalService
      .show<boolean>(ConfirmationModalComponent, {
        title:
          role === UserRole.admin
            ? 'Назначить администратора?'
            : 'Снять роль администратора?',
        subtitle: `${user.username} · ${user.email}`,
        agreeBtnText: role === UserRole.admin ? 'Назначить' : 'Снять роль',
        rejectBtnText: 'Отмена',
      })
      .pipe(
        tap(() => this.#r2.removeClass(document.body, 'no-scroll')),
        filter((confirmed) => confirmed === true),
        switchMap(() => this.#adminService.updateRole(user.id, role)),
        finalize(() => this.pendingUserId.set(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => this.#replaceUser(user.id, { role }),
        error: () =>
          this.actionError.set('Не удалось изменить роль пользователя.'),
      });
  }

  #replaceUser(id: number, changes: Partial<AdminUserDto>) {
    this.users.update((users) =>
      users.map((user) => (user.id === id ? { ...user, ...changes } : user)),
    );
  }
}
