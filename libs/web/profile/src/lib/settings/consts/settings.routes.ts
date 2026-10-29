import type { BaseRoutes } from '@wm/web/shared';
import { AccountSettingsComponent } from '../account-settings/account-settings.component';

/** Маршруты настроек аккаунта. */
export const settingsRoutes: BaseRoutes = [
  {
    path: '',
    component: AccountSettingsComponent,
    data: {
      seo: {
        title: 'Настройки аккаунта',
        description: 'Смена пароля и управление сессиями GameMaster Helper.',
        index: false,
        canonicalPath: '/settings',
      },
    },
  },
];
