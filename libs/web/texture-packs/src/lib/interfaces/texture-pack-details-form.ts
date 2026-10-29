import type { FormControl } from '@angular/forms';

/** Элементы формы метаданных набора; валидация и сохранение принадлежат странице. */
export interface TexturePackDetailsFormControls {
  name: FormControl<string>;
  description: FormControl<string>;
}
