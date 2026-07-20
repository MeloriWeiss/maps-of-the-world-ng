import { OutputRef, Type } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastInputs {
  message: string;
}

export interface ToastConfig {
  duration: number;
  autoclose: boolean;
}

export interface ToastQueueItem {
  toastComponent: Type<ToastComponent>;
  inputs: ToastInputs;
  config: ToastConfig;
  result$: Subject<unknown>;
}

export interface ToastComponent {
  show: VoidFunction;
  hide: (done: VoidFunction) => void;
  closed?: OutputRef<unknown>;
}
