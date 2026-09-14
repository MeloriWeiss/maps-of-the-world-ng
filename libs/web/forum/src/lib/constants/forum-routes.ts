import { Routes } from '@angular/router';
import { ForumPageComponent } from '../feature-forum-page/index';
import { ForumDiscussionsListComponent } from '../feature-forum-discussions-list';
import { canActivateAuth } from '@wm/web/auth';
import {
  ForumEditorComponent,
  confirmForumEditorExit,
} from '../feature-forum-editor/forum-editor.component';

export const forumRoutes: Routes = [
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
