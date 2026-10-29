/** Описание режима приложения и его раздела материалов. */
export interface Mode {
  id: number;
  name: string;
  author: string;
  likesCount: number;
  commentsCount: number;
  description: string;
  images: {
    url: string;
  }[];
}

/** Параметры фильтрации и пагинации материалов режима. */
export interface GetModsDto {
  page: number;
  search: string;
}
