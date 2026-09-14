import { Directive, input } from '@angular/core';

/** Browser-level protection shared by editors; in-app navigation uses route guards. */
@Directive({
  selector: '[wmUnsavedChanges]',
  standalone: true,
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
})
export class UnsavedChangesDirective {
  readonly wmUnsavedChanges = input(false);
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.wmUnsavedChanges()) event.preventDefault();
  }
}
