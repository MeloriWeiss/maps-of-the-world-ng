import {Routes} from '@angular/router';
import {canActivateAuth, LoginPageComponent, SignupPageComponent} from '@wm/auth';
import {AuthLayoutComponent} from '@wm/layout/auth';
import {BaseLayoutComponent} from '@wm/layout/base';
import {ErrorComponent} from '@wm/common-ui';

export const routes: Routes = [
  {
    path: '',
    component: BaseLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'profile/me',
        pathMatch: 'full',
      },
      {
        path: 'profile/:id',
        component: ErrorComponent,
      },
      {
        path: 'forum',
        component: ErrorComponent,
      }
    ],
    canActivate: [canActivateAuth],
    title: 'Maps of the world'
  },

  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        component: LoginPageComponent
      },
      {
        path: 'signup',
        component: SignupPageComponent
      }
    ],
    title: 'Maps of the world: вход'
  },

  {
    path: '**',
    component: ErrorComponent
  }
];
