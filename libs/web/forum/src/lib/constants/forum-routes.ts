import { Routes } from '@angular/router';
import { ForumPageComponent } from '../feature-forum-page/index';
import { ForumDiscussionsListComponent } from '../feature-forum-discussions-list';

export const forumRoutes: Routes = [
  {
    path: '',
    component: ForumDiscussionsListComponent,
    data: {
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
      seo: {
        title: 'Обсуждение на форуме',
        description: 'Обсуждение сообщества GameMaster Helper.',
        index: true,
        type: 'article',
      },
    },
  },
];
