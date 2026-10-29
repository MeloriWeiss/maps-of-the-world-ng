import { InjectionToken } from '@angular/core';

/** Контракт родительского компонента для варианта списка выбора. */
export interface SelectHost {
  select(value: string): void;
  isSelected(value: string): boolean;
}

/** Токен внедрения родительского компонента select. */
export const SELECT_HOST = new InjectionToken<SelectHost>('SELECT_HOST');
