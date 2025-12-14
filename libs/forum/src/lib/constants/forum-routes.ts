import { Routes } from '@angular/router';
import { ForumPageComponent } from '../feature-forum-page/index';
import { ForumDiscussionsListComponent } from '../feature-forum-discussions-list';

export const forumRoutes: Routes = [
  {
    path: '',
    component: ForumDiscussionsListComponent,
  },
  {
    path: ':id',
    component: ForumPageComponent,
  },
];
