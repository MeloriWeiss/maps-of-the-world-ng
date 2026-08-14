import { assertDevelopmentSeedAllowed } from './seed-environment';

describe('assertDevelopmentSeedAllowed', () => {
  it('allows the development seed outside production', () => {
    expect(() => assertDevelopmentSeedAllowed(false)).not.toThrow();
  });

  it('blocks the development seed in production', () => {
    expect(() => assertDevelopmentSeedAllowed(true)).toThrow(
      'Development seed is disabled when NODE_ENV=production',
    );
  });
});
