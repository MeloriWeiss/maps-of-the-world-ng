import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('uses the saved theme when it is supported', () => {
    localStorage.setItem('theme', 'steampunk');
    mockSystemDarkTheme(false);

    const service = TestBed.inject(ThemeService);

    expect(service.currentTheme()).toBe('steampunk');
  });

  it('uses the system theme when the saved theme is not supported', () => {
    localStorage.setItem('theme', 'unknown-theme');
    mockSystemDarkTheme(true);

    const service = TestBed.inject(ThemeService);
    TestBed.flushEffects();

    expect(service.currentTheme()).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });
});

function mockSystemDarkTheme(matches: boolean) {
  const mediaQueryList: MediaQueryList = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: jest.fn(() => mediaQueryList),
  });
}
