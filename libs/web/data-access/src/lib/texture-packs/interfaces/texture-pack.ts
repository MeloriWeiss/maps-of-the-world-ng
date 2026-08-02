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
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  previewTextures: TextureItem[];
  _count: {
    textures: number;
  };
}

export interface TexturePackAuthor {
  id: number;
  nickname: string;
}

export interface PublishedTexturePack extends TexturePack {
  isLiked: boolean;
  author: TexturePackAuthor;
}

export interface TexturePackView extends Omit<TexturePack, 'previewTextures'> {
  previewTextures: TextureItemView[];
}

export type TexturePackDetails = Omit<TexturePack, 'previewTextures'>;

export interface PublishedTexturePackView
  extends Omit<PublishedTexturePack, 'previewTextures'> {
  previewTextures: TextureItemView[];
}

export type PublishedTexturePackDetails = Omit<
  PublishedTexturePack,
  'previewTextures'
>;

export interface CreateTexturePack {
  name: string;
  description?: string;
}

export interface UpdateTexturePack {
  name: string;
  description?: string;
}

export interface TexturePackLikeState {
  isLiked: boolean;
  likesCount: number;
}

export interface TexturePage {
  items: TextureItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TexturePageView extends Omit<TexturePage, 'items'> {
  items: TextureItemView[];
}
