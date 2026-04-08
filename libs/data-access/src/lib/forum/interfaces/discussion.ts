export interface Discussion {
  id: number;
  theme: string;
  author: string;
  createdAt: string;
  commentsCount: number;
  likes: number;
}

export interface GetDiscussionsDto {
  page: number;
  search: string;
}
