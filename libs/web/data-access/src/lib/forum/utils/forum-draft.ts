import type { CreateForumDiscussion } from '../interfaces';

/** Проверяет, содержит ли локальный объект черновик темы форума. */
export function isForumDraft(value: unknown): value is CreateForumDiscussion {
  return (
    !!value &&
    typeof value === 'object' &&
    'title' in value &&
    typeof value.title === 'string' &&
    value.title.length <= 160 &&
    'post' in value &&
    typeof value.post === 'string' &&
    value.post.length <= 20000 &&
    'category' in value &&
    typeof value.category === 'string'
  );
}
