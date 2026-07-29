export interface TextureItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface TextureItemView extends TextureItem {
  fileUrl: string;
}

export interface TexturePack {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  previewTextures: TextureItem[];
  _count: {
    textures: number;
  };
}

export interface TexturePackView extends Omit<TexturePack, 'previewTextures'> {
  previewTextures: TextureItemView[];
}

export interface CreateTexturePack {
  name: string;
  description?: string;
}

export interface TexturePage {
  items: TextureItem[];
  total: number;
  page: number;
  pageSize: number;
}
