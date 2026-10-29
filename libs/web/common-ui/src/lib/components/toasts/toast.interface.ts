import { OutputRef, Type } from '@angular/core';
import { Subject } from 'rxjs';

/** Текст и дополнительные параметры уведомления. */
export interface ToastInputs {
  message: string;
}

/** Конфигурация времени и поведения очереди уведомлений. */
export interface ToastConfig {
  duration: number;
  autoclose: boolean;
}

/** Элемент очереди активных уведомлений. */
export interface ToastQueueItem {
  toastComponent: Type<ToastComponent>;
  inputs: ToastInputs;
  config: ToastConfig;
  result$: Subject<unknown>;
}

/** Контракт компонента, отображающего уведомление. */
export interface ToastComponent {
  show: VoidFunction;
  hide: (done: VoidFunction) => void;
  closed?: OutputRef<unknown>;
}
