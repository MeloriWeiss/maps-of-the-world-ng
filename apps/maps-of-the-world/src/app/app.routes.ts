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
        redirectTo: 'personal',
        pathMatch: 'full',
      },
      {
        path: 'personal',
        component: ErrorComponent,
      },
      {
        path: 'forum',
        component: ErrorComponent,
      }
    ],
    canActivate: [canActivateAuth]
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
    ]
  },

  {
    path: '**',
    component: ErrorComponent
  }
];
