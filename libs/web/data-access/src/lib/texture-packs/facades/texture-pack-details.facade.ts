import { inject, Injectable } from '@angular/core';
import { forkJoin } from 'rxjs';
import { TexturePacksService } from '../services/texture-packs.service';

/**
 * Координирует загрузку набора и первых страниц двух видов текстур.
 *
 * Фасад не хранит состояние и не подписывается на запросы. Вызывающая сторона
 * управляет временем жизни подписки, загрузкой и отображением ошибок.
 */
@Injectable({ providedIn: 'root' })
export class TexturePackDetailsFacade {
  readonly #texturePacksService = inject(TexturePacksService);

  /**
   * Загружает опубликованный набор и его текстуры параллельно.
   *
   * @param packId Идентификатор опубликованного набора.
   * @param pageSize Размер первой страницы каждого вида текстур.
   * @returns Поток общего результата; ошибка любого запроса прерывает загрузку.
   */
  loadPublic(packId: string, pageSize = 48) {
    return forkJoin({
      pack: this.#texturePacksService.getPublicPack(packId),
      surfaces: this.#texturePacksService.listPublicTextures(
        packId,
        1,
        pageSize,
        'SURFACE',
      ),
      stamps: this.#texturePacksService.listPublicTextures(
        packId,
        1,
        pageSize,
        'STAMP',
      ),
    });
  }

  /** Загружает данные редактора через API владельца набора. */
  loadOwned(packId: string, pageSize = 48) {
    return forkJoin({
      pack: this.#texturePacksService.getOwned(packId),
      ...this.#ownedTextureRequests(packId, pageSize),
    });
  }

  /** Обновляет первые страницы галереи без повторной загрузки данных набора. */
  reloadOwnedTextures(packId: string, pageSize = 48) {
    return forkJoin(this.#ownedTextureRequests(packId, pageSize));
  }

  #ownedTextureRequests(packId: string, pageSize: number) {
    return {
      surfaces: this.#texturePacksService.listOwnedTextures(
        packId,
        1,
        pageSize,
        'SURFACE',
      ),
      stamps: this.#texturePacksService.listOwnedTextures(
        packId,
        1,
        pageSize,
        'STAMP',
      ),
    };
  }
}
