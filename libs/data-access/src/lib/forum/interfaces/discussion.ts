export interface Discussion {
  id: number;
  theme: string;
  author: string;
  createdAt: string;
  commentsCount: number;
}

export interface GetDiscussionsDto {
  page: number;
  search: string;
}
