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

export interface GetModsDto {
  page: number;
  search: string;
}
