import { authReturnUrl } from './auth-return-url';

describe('Authentication return URL', () => {
  it('preserves an internal forum route and its query', () => {
    expect(authReturnUrl('/forum/new?category=maps')).toBe(
      '/forum/new?category=maps',
    );
  });
  it('rejects external destinations', () => {
    for (const value of [
      null,
      'https://example.org',
      '//example.org',
      '/\\example.org',
    ])
      expect(authReturnUrl(value)).toBe('/');
  });
});
