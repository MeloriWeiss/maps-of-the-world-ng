import type { BaseRoutes } from '@wm/web/shared';
import { ForumPageComponent } from '../feature-forum-page';
import { ForumDiscussionsListComponent } from '../feature-forum-discussions-list';
import { canActivateAuth } from '@wm/web/auth';
import {
  ForumEditorComponent,
  confirmForumEditorExit,
} from '../feature-forum-editor/forum-editor/forum-editor.component';

/** Маршруты страниц форума. */
export const forumRoutes: BaseRoutes = [
  {
    path: 'sections/:slug',
    component: ForumDiscussionsListComponent,
    data: {
      preserveScrollOnQueryChange: true,
      seo: {
        title: 'Раздел форума',
        description: 'Обсуждения сообщества GameMaster Helper.',
        index: true,
      },
    },
  },
  {
    path: 'new',
    component: ForumEditorComponent,
    canActivate: [canActivateAuth],
    canDeactivate: [confirmForumEditorExit],
    data: {
      seo: {
        title: 'Новая тема',
        description: 'Создание темы сообщества GameMaster Helper.',
        index: false,
      },
    },
  },
  {
    path: ':id/edit',
    component: ForumEditorComponent,
    canActivate: [canActivateAuth],
    canDeactivate: [confirmForumEditorExit],
    data: {
      seo: {
        title: 'Редактирование темы',
        description: 'Редактирование темы сообщества GameMaster Helper.',
        index: false,
      },
    },
  },
  {
    path: '',
    component: ForumDiscussionsListComponent,
    data: {
      preserveScrollOnQueryChange: true,
      seo: {
        title: 'Форум о создании карт и НРИ',
        description:
          'Обсуждения создания карт, текстур и проведения настольных ролевых игр.',
        index: true,
        canonicalPath: '/forum',
      },
    },
  },
  {
    path: ':id',
    component: ForumPageComponent,
    data: {
      preserveScrollOnQueryChange: true,
      seo: {
        title: 'Обсуждение на форуме',
        description: 'Обсуждение сообщества GameMaster Helper.',
        index: true,
        type: 'article',
      },
    },
  },
];
