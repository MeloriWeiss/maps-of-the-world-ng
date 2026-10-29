import type { ForumMessage } from './discussion';

/** Корневая ветка дерева ответов на комментарии. */
export interface CommentBranch {
  items: ForumMessage[];
  expanded: boolean;
  loading: boolean;
  error: boolean;
  requestedPage: number;
  firstPage: number;
  lastPage: number;
  pageCount: number;
}

/** Комментарий с данными, нужными для построения дерева ответов. */
export interface CommentRow {
  kind: 'message' | 'branch';
  key: string;
  message: ForumMessage;
  depth: number;
  indent: number;
  branch: CommentBranch | undefined;
}
