import { InjectionToken } from '@angular/core';

export interface SelectHost {
  select(value: string): void;
  isSelected(value: string): boolean;
}

export const SELECT_HOST = new InjectionToken<SelectHost>('SELECT_HOST');
