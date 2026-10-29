import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type {
  AccountResponseDto,
  ProfileSummaryDto,
  UpdateAccountRequestDto,
} from '@wm/shared/accounts';
import { map } from 'rxjs';
import { API_CONFIG } from '../../shared';
import type {
  FavouritesResponse,
  UploadedAvatarResponse,
  RemovedAvatarResponse,
} from '../interfaces';
import { toFavourites } from '../utils/favourites.mapper';

/**
 * HTTP-доступ к профилям, избранному и аватару текущего аккаунта.
 * Подготовку данных для отображения делегирует чистым мапперам.
 */
@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  #http = inject(HttpClient);
  #apiConfig = inject(API_CONFIG);

  /**
   * Загружает общедоступную сводку выбранного профиля.
   * Без идентификатора обращается к сводке текущего пользователя.
   */
  getProfileSummary(userId?: number) {
    const path =
      userId === undefined
        ? 'accounts/me/summary'
        : `accounts/profiles/${userId}`;

    return this.#http.get<ProfileSummaryDto>(
      `${this.#apiConfig.baseUrl}${path}`,
    );
  }

  /** Возвращает данные текущего аккаунта, доступные его владельцу. */
  getMyAccount() {
    return this.#http.get<AccountResponseDto>(
      `${this.#apiConfig.baseUrl}accounts/me`,
    );
  }

  /** Загружает избранное текущего пользователя с готовыми URL превью. */
  getMyFavourites() {
    return this.#http
      .get<FavouritesResponse>(
        `${this.#apiConfig.baseUrl}accounts/me/favourites`,
      )
      .pipe(
        map((favourites) => toFavourites(favourites, this.#apiConfig.baseUrl)),
      );
  }

  /** Отправляет изменения данных текущего аккаунта. */
  updateMyAccount(account: UpdateAccountRequestDto) {
    return this.#http.patch<AccountResponseDto>(
      `${this.#apiConfig.baseUrl}accounts/me`,
      account,
    );
  }

  /** Загружает файл аватара в multipart-запросе и возвращает его URL. */
  uploadAvatar(file: File) {
    const body = new FormData();
    body.append('file', file);

    return this.#http.post<UploadedAvatarResponse>(
      `${this.#apiConfig.baseUrl}accounts/me/avatar`,
      body,
    );
  }

  /** Удаляет аватар текущего аккаунта. */
  removeAvatar() {
    return this.#http.delete<RemovedAvatarResponse>(
      `${this.#apiConfig.baseUrl}accounts/me/avatar`,
    );
  }
}
