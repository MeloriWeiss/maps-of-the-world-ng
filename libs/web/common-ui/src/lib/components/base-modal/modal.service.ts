import { Injectable, Type, ViewContainerRef } from '@angular/core';
import { outputToObservable } from '@angular/core/rxjs-interop';
import { Observable, of } from 'rxjs';
import { BaseObject, ModalClose } from '@wm/data-access/shared';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  #container?: ViewContainerRef;

  registerContainer(vcr: ViewContainerRef) {
    this.#container = vcr;
  }

  show<T, R extends BaseObject = BaseObject>(
    modalComponent: Type<ModalClose>,
    inputs?: R,
  ): Observable<T | undefined> {
    if (!this.#container) return of(undefined);

    const componentRef = this.#container.createComponent(modalComponent);
    const instance = componentRef.instance;

    if (inputs) {
      Object.entries(inputs).forEach(([name, value]) => {
        componentRef.setInput(name, value);
      });
    }

    return outputToObservable(instance.closed) as Observable<T | undefined>;
  }

  close() {
    const container = this.#container;
    const containerLength = container?.length;

    if (!container || !containerLength) return;

    container.remove(containerLength - 1);
  }
}
