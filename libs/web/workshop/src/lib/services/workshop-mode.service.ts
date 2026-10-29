import { Injectable, signal } from '@angular/core';

/** Управляет режимом просмотра и редактирования Workshop. */
@Injectable()
export class WorkshopModeService {
  readonly isReadOnly = signal(false);
}
