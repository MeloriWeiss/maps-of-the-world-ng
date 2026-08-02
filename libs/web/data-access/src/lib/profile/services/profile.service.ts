import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  AccountResponseDto,
  ProfileSummaryDto,
  UpdateAccountRequestDto,
} from '@wm/shared/accounts';
import { map } from 'rxjs';
import { API_CONFIG } from '../../shared';
import { PublishedMapSummary } from '../../maps';
import {
  TextureItem,
  TextureItemView,
  TexturePackAuthor,
} from '../../texture-packs';

export interface FavouriteMap extends PublishedMapSummary {
  likedAt: string;
}

export interface FavouriteTexturePack {
  id: string;
  name: string;
  description: string | null;
  likesCount: number;
  likedAt: string;
  author: TexturePackAuthor;
  previewTextures: TextureItemView[];
  _count: { textures: number };
}

export interface Favourites {
  maps: FavouriteMap[];
  texturePacks: FavouriteTexturePack[];
}

interface FavouritesResponse extends Omit<Favourites, 'texturePacks'> {
  texturePacks: Array<
    Omit<FavouriteTexturePack, 'previewTextures'> & {
      previewTextures: TextureItem[];
    }
  >;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  #http = inject(HttpClient);
  #apiConfig = inject(API_CONFIG);

  getProfileSummary(userId?: number) {
    const path =
      userId === undefined
        ? 'accounts/me/summary'
        : `accounts/profiles/${userId}`;
    return this.#http.get<ProfileSummaryDto>(
      `${this.#apiConfig.baseUrl}${path}`,
    );
  }

  getMyAccount() {
    return this.#http.get<AccountResponseDto>(
      `${this.#apiConfig.baseUrl}accounts/me`,
    );
  }

  getMyFavourites() {
    return this.#http
      .get<FavouritesResponse>(
        `${this.#apiConfig.baseUrl}accounts/me/favourites`,
      )
      .pipe(
        map(
          (favourites): Favourites => ({
            ...favourites,
            texturePacks: favourites.texturePacks.map((pack) => ({
              ...pack,
              previewTextures: pack.previewTextures.map((texture) => ({
                ...texture,
                fileUrl: `${this.#apiConfig.baseUrl}textures/${texture.id}/file`,
              })),
            })),
          }),
        ),
      );
  }

  updateMyAccount(account: UpdateAccountRequestDto) {
    return this.#http.patch<AccountResponseDto>(
      `${this.#apiConfig.baseUrl}accounts/me`,
      account,
    );
  }

  uploadAvatar(file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.#http.post<{
      avatarUrl: string;
    }>(`${this.#apiConfig.baseUrl}accounts/me/avatar`, body);
  }

  removeAvatar() {
    return this.#http.delete<{
      avatarUrl: null;
    }>(`${this.#apiConfig.baseUrl}accounts/me/avatar`);
  }
}
