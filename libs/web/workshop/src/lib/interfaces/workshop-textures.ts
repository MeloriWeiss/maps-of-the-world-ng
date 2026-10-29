/** Текстура Workshop с готовым URL изображения для редактора. */
export interface WorkshopTexture {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  imageUrl: string;
}

/** Краткие сведения о наборе текстур и количестве файлов в нём. */
export interface WorkshopTexturePack {
  id: string;
  name: string;
  _count: {
    textures: number;
  };
}

/** Метаданные текстуры, возвращаемые API Workshop. */
export interface TextureResponse {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
}

/** Страница текстур с общим количеством результатов и параметрами пагинации. */
export interface TexturePageResponse {
  items: TextureResponse[];
  total: number;
  page: number;
  pageSize: number;
}
