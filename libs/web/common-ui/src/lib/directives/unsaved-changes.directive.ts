import { Directive, input } from '@angular/core';

/** Предупреждает о несохранённых изменениях при закрытии вкладки; внутреннюю навигацию проверяют route guards. */
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
