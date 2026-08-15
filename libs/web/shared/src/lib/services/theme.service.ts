import { effect, Injectable, signal } from '@angular/core';

export interface Theme {
  id: string;
  title: string;
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly themes: Theme[] = [
    { id: 'light', title: 'Светлая' },
    { id: 'dark', title: 'Темная' },
    { id: 'steampunk', title: 'Стимпанк' },
    { id: 'neon-sunset', title: 'Неоновый вечер' },
  ];

  readonly currentTheme = signal<string>('light');

  private STORAGE_THEME = 'theme';

  constructor() {
    this.initializeTheme();

    effect(() => {
      const themeId = this.currentTheme();

      localStorage.setItem(this.STORAGE_THEME, themeId);

      document.documentElement.setAttribute('data-theme', themeId);
    });
  }

  setTheme(theme: string) {
    if (this.themes.some((t) => t.id === theme)) this.currentTheme.set(theme);
  }

  private initializeTheme() {
    const savedTheme = localStorage.getItem(this.STORAGE_THEME);

    if (savedTheme && this.themes.some((theme) => theme.id === savedTheme)) {
      this.setTheme(savedTheme);
      return;
    }

    const isSystemDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;

    if (isSystemDark) this.setTheme('dark');
    else this.setTheme('light');
  }
}
