import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  ActivatedRoute,
  CanDeactivateFn,
  Router,
  RouterLink,
} from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { ForumEditorStore } from '@wm/web/data-access/forum';
import {
  ConfirmationModalComponent,
  ModalService,
  UnsavedChangesDirective,
  SelectComponent,
  SelectOptionComponent,
} from '@wm/web/common-ui';
import { map, take } from 'rxjs';

/** Редактор создания и изменения темы форума. */
@Component({
  selector: 'wm-forum-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    UnsavedChangesDirective,
    SelectComponent,
    SelectOptionComponent,
  ],
  providers: [ForumEditorStore],
  templateUrl: './forum-editor.component.html',
  styleUrl: './forum-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumEditorComponent {
  readonly store = inject(ForumEditorStore);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly id = Number(this.#route.snapshot.paramMap.get('id')) || null;
  readonly showPreview = signal(false);
  constructor() {
    this.reload();
  }
  reload() {
    this.store.load(
      this.id,
      this.#route.snapshot.queryParamMap.get('category') ?? '',
    );
  }
  selectCategory(category: string) {
    const control = this.store.form.controls.category;
    control.setValue(category);
    control.markAsDirty();
    control.markAsTouched();
  }
  submit() {
    this.store.save((id) => {
      void this.#router.navigate(['/forum', id]);
    });
  }
}

/** Спрашивает подтверждение перед уходом со страницы с несохранённой темой. */
export const confirmForumEditorExit: CanDeactivateFn<ForumEditorComponent> = (
  component,
) => {
  if (component.store.pending()) return false;
  if (!component.store.dirty()) return true;
  return inject(ModalService)
    .show<boolean>(ConfirmationModalComponent, {
      title: 'Выйти из редактора?',
      subtitle: 'Изменения ещё не опубликованы.',
      agreeBtnText: 'Выйти',
      rejectBtnText: 'Продолжить писать',
    })
    .pipe(
      take(1),
      map((confirmed) => confirmed === true),
    );
};
