import { Injectable, Type, ViewContainerRef } from '@angular/core';
import {
  firstValueFrom,
  map,
  merge,
  Observable,
  of,
  ReplaySubject,
  timer,
} from 'rxjs';
import { outputToObservable } from '@angular/core/rxjs-interop';
import {
  ToastComponent,
  ToastConfig,
  ToastInputs,
  ToastQueueItem,
} from './toast.interface';
import { defaultToastConfig } from './default-toast.config';

/** Показывает временные уведомления и управляет временем их отображения. */
@Injectable({
  providedIn: 'root',
})
export class ToastService {
  #container?: ViewContainerRef;
  #queue: ToastQueueItem[] = [];
  #maxShowCount = 3;
  #maxQueueCount = 10;
  #currentShowCount = 0;

  registerContainer(vcr: ViewContainerRef) {
    this.#container = vcr;
    while (this.#queue.length && this.#currentShowCount < this.#maxShowCount)
      this.#processQueue();
  }

  show<T extends Record<string, unknown>>(
    toastComponent: Type<ToastComponent>,
    inputs: ToastInputs,
    params?: Partial<ToastConfig>,
  ): Observable<T | undefined> {
    const config = { ...defaultToastConfig, ...params };

    const result$ = new ReplaySubject<unknown>(1);

    this.#queue.push({ toastComponent, inputs, config, result$ });
    while (this.#queue.length > this.#maxQueueCount) {
      const dropped = this.#queue.shift();
      dropped?.result$.next(undefined);
      dropped?.result$.complete();
    }

    this.#processQueue();

    return result$.asObservable() as Observable<T | undefined>;
  }

  #processQueue() {
    if (!this.#container || this.#currentShowCount >= this.#maxShowCount)
      return;

    const toast = this.#queue.shift();
    if (!toast) return;

    this.#currentShowCount++;

    this.#processToast(toast);
  }

  #processToast({ toastComponent, inputs, config, result$ }: ToastQueueItem) {
    if (!this.#container) return;

    const componentRef = this.#container.createComponent(toastComponent);
    const instance = componentRef.instance;

    if (inputs) {
      Object.entries(inputs).forEach(([name, value]) => {
        componentRef.setInput(name, value);
      });
    }

    setTimeout(() => {
      instance.show();
    });

    const closed$ = instance.closed
      ? outputToObservable(instance.closed)
      : of(undefined);

    const stopShowing$ = config.autoclose
      ? merge(timer(config.duration).pipe(map(() => undefined)), closed$)
      : closed$;

    firstValueFrom(stopShowing$).then((res) => {
      instance.hide(() => {
        result$.next(res);
        result$.complete();
        this.#currentShowCount--;
        this.#processQueue();
        componentRef.destroy();
      });
    });
  }
}
