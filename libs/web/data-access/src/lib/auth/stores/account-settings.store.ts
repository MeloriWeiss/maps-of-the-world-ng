import type { ChangePasswordData } from '../interfaces';
import type { Session } from '../interfaces/account-session';
import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, tap } from 'rxjs';

import { AuthService } from '../services';
import { toAccountSessionViews } from '../utils/account-session.mapper';

/** Управляет состоянием списка сеансов и формы смены пароля. */
@Injectable()
export class AccountSettingsStore {
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #sessions = signal<Session[]>([]);
  readonly sessions = computed(() => toAccountSessionViews(this.#sessions()));

  readonly loading = signal(false);
  readonly savingPassword = signal(false);
  readonly endingSession = signal<number | null>(null);
  readonly confirmationId = signal<number | null>(null);
  readonly sessionError = signal('');
  readonly passwordError = signal('');
  readonly passwordSuccess = signal('');
  readonly sessionSuccess = signal('');
  readonly busy = computed(
    () =>
      this.loading() || this.savingPassword() || this.endingSession() !== null,
  );

  loadSessions() {
    if (this.busy()) return;
    this.loading.set(true);
    this.sessionError.set('');
    this.#auth
      .getSessions()
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ sessions }) => this.#sessions.set(sessions),
        error: () =>
          this.sessionError.set(
            'Не удалось загрузить сессии. Попробуйте ещё раз.',
          ),
      });
  }

  endSession(id: number) {
    if (this.busy()) return;
    const session = this.#sessions().find((item) => item.id === id);
    if (!session || this.confirmationId() !== id) return;
    this.endingSession.set(id);
    this.sessionError.set('');
    this.sessionSuccess.set('');
    this.#auth
      .endSession(id, !!session.isCurrent)
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.endingSession.set(null)),
      )
      .subscribe({
        next: () => {
          this.#sessions.update((sessions) =>
            sessions.filter((item) => item.id !== id),
          );
          this.confirmationId.set(null);
          this.sessionSuccess.set(
            'Сессия завершена. На этом устройстве потребуется войти заново.',
          );
        },
        error: () =>
          this.sessionError.set(
            'Не удалось завершить сессию. Попробуйте ещё раз.',
          ),
      });
  }

  changePassword(data: ChangePasswordData) {
    this.savingPassword.set(true);
    this.passwordError.set('');
    this.passwordSuccess.set('');
    return this.#auth.changePassword(data).pipe(
      tap({
        next: () => {
          this.#sessions.update((sessions) =>
            sessions.filter((session) => session.isCurrent),
          );
          this.confirmationId.set(null);
          this.passwordSuccess.set(
            'Пароль изменён. Все остальные сессии завершены.',
          );
        },
        error: (error: unknown) =>
          this.passwordError.set(passwordErrorMessage(error)),
      }),
      finalize(() => this.savingPassword.set(false)),
    );
  }
}

function passwordErrorMessage(error: unknown) {
  if (error instanceof HttpErrorResponse && error.status === 400) {
    const body: unknown = error.error;
    if (body && typeof body === 'object' && 'message' in body) {
      if (typeof body.message === 'string') return body.message;
      if (
        Array.isArray(body.message) &&
        body.message.every((item: unknown) => typeof item === 'string')
      )
        return body.message.join('. ');
    }
  }
  return 'Не удалось изменить пароль. Попробуйте ещё раз.';
}
