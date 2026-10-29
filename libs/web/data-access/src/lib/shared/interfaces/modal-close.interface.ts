import { OutputRef } from '@angular/core';

/** Значение, возвращаемое при закрытии модального окна. */
export interface ModalClose {
  closed: OutputRef<unknown>;
}
