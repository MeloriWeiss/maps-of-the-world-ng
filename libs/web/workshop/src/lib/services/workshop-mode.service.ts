import { Injectable, signal } from '@angular/core';

@Injectable()
export class WorkshopModeService {
  readonly isReadOnly = signal(false);
}
