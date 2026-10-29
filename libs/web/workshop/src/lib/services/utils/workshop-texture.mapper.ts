import type {
  TextureResponse,
  WorkshopTexture,
} from '../../interfaces/workshop-textures';

/** Преобразует ответ API в данные текстуры для редактора Workshop. */
export function toWorkshopTexture(texture: TextureResponse): WorkshopTexture {
  return {
    ...texture,
    imageUrl: `/api/textures/${encodeURIComponent(texture.id)}/file`,
  };
}
