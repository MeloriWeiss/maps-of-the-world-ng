import { isProd } from '@wm/api/shared';

/** Запрещает запуск заполнения базы в неподходящем окружении. */
export const assertDevelopmentSeedAllowed = (production = isProd) => {
  if (!production) return;

  throw new Error(
    'Development seed is disabled when NODE_ENV=production. Use migrations and yarn admin:create-super instead.',
  );
};
