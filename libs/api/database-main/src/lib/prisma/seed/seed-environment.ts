import { isProd } from '@wm/api/shared';

export const assertDevelopmentSeedAllowed = (production = isProd) => {
  if (!production) return;

  throw new Error(
    'Development seed is disabled when NODE_ENV=production. Use migrations and yarn admin:create-super instead.',
  );
};
