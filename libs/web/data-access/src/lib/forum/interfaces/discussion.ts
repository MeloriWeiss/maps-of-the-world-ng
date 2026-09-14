export interface Discussion {
  isPinned?: boolean;
  isClosed?: boolean;
  lastActivityAt?: string;
  authorId?: number;
  avatarUrl?: string | null;
  id: number;
  theme: string;
  author: string;
  createdAt: string;
  commentsCount: number;
  likes: number;
  isLiked: boolean;
  category: ForumCategorySummary;
}

export interface GetDiscussionsDto {
  sort?: 'active' | 'new' | 'unanswered';
  scope?: 'mine';
  page: number;
  pageSize?: number;
  search?: string;
  category?: string;
}

export interface ForumCategorySummary {
  slug: string;
  title: string;
}

export interface ForumCategory extends ForumCategorySummary {
  id: number;
  description: string | null;
  discussionsCount: number;
}

export interface ForumAuthor {
  id: number;
  nickname: string;
  avatarUrl: string | null;
}

export interface ForumComment {
  id: number;
  text: string;
  createdAt: string;
  updatedAt: string;
  author: ForumAuthor;
  replies: ForumComment[];
}

export interface ForumDiscussionDetails {
  isPinned: boolean;
  isClosed: boolean;
  canEdit: boolean;
  lastActivityAt: string;
  id: number;
  title: string;
  post: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  category: ForumCategorySummary;
  author: ForumAuthor;
  comments: ForumComment[];
}

export interface ForumDiscussionsPage {
  items: Array<{
    isPinned: boolean;
    isClosed: boolean;
    lastActivityAt: string;
    id: number;
    title: string;
    createdAt: string;
    likesCount: number;
    commentsCount: number;
    isLiked: boolean;
    category: ForumCategorySummary;
    author: ForumAuthor;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateForumDiscussion {
  title: string;
  post: string;
  category: string;
}

export interface CreateForumComment {
  comment: string;
  parentId?: number;
}

export interface ForumMessage {
  id: number;
  repliesCount?: number;
  text: string;
  isHidden: boolean;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
  author: ForumAuthor;
  parent: { id: number; nickname: string } | null;
}

export interface ForumCommentsPage {
  path?: Array<{ id: number; parentId: number | null; page: number }>;
  items: ForumMessage[];
  page: number;
  pageSize: number;
  total: number;
}
