import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { UserRoleType, UserStatusType } from '@wm/shared/users';
import { AdminService } from '../services';
import { confirmedRequest } from '../utils/confirmed-request';

/**
 * Координирует подтверждённые действия модерации.
 * Интерфейс сам показывает диалог и передаёт поток его результата;
 * проверка полномочий остаётся на сервере.
 */
@Injectable({ providedIn: 'root' })
export class AdminModerationFacade {
  readonly #api = inject(AdminService);

  /** Изменяет видимость карты после подтверждения. */
  setMapVisibility(
    confirmation: Observable<boolean | undefined>,
    id: number,
    isHidden: boolean,
  ) {
    return confirmedRequest(confirmation, () =>
      this.#api.updateMapVisibility(id, isHidden),
    );
  }

  /** Изменяет видимость набора текстур после подтверждения. */
  setTexturePackVisibility(
    confirmation: Observable<boolean | undefined>,
    id: string,
    isHidden: boolean,
  ) {
    return confirmedRequest(confirmation, () =>
      this.#api.updateTexturePackVisibility(id, isHidden),
    );
  }

  /** Изменяет видимость обсуждения после подтверждения. */
  setDiscussionVisibility(
    confirmation: Observable<boolean | undefined>,
    id: number,
    isHidden: boolean,
  ) {
    return confirmedRequest(confirmation, () =>
      this.#api.updateDiscussionVisibility(id, isHidden),
    );
  }

  /** Передаёт подтверждённое изменение статуса пользователя в API. */
  setUserStatus(
    confirmation: Observable<boolean | undefined>,
    id: number,
    status: UserStatusType,
  ) {
    return confirmedRequest(confirmation, () =>
      this.#api.updateStatus(id, status),
    );
  }

  /** Передаёт подтверждённое изменение роли пользователя в API. */
  setUserRole(
    confirmation: Observable<boolean | undefined>,
    id: number,
    role: UserRoleType,
  ) {
    return confirmedRequest(confirmation, () => this.#api.updateRole(id, role));
  }
}
