import { Injectable, Type, ViewContainerRef } from '@angular/core';
import {
  firstValueFrom,
  map,
  merge,
  Observable,
  of,
  Subject,
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

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  #container?: ViewContainerRef;
  #queue: ToastQueueItem[] = [];
  #maxShowCount = 3;
  #currentShowCount = 0;

  registerContainer(vcr: ViewContainerRef) {
    this.#container = vcr;
  }

  show<T extends Record<string, unknown>>(
    toastComponent: Type<ToastComponent>,
    inputs: ToastInputs,
    params?: Partial<ToastConfig>,
  ): Observable<T | undefined> {
    const config = { ...defaultToastConfig, ...params };

    const result$ = new Subject<unknown>();

    this.#queue.push({ toastComponent, inputs, config, result$ });

    this.#processQueue();

    return result$.asObservable() as Observable<T | undefined>;
  }

  #processQueue() {
    if (this.#currentShowCount >= this.#maxShowCount) return;

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
