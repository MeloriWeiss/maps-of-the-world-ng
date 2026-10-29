import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { ReactiveFormsModule, type FormGroup } from '@angular/forms';
import type { TexturePackDetailsFormControls } from '../../../interfaces/texture-pack-details-form';

/**
 * Отображает поля названия и описания набора и состояние сохранения.
 *
 * Получает готовую форму от страницы и сообщает о её отправке. Не выполняет
 * HTTP-запросы и не сбрасывает изменения: это ответственность родителя.
 */
@Component({
  selector: 'wm-texture-pack-details-form',
  imports: [ReactiveFormsModule],
  templateUrl: './texture-pack-details-form.component.html',
  styleUrl: './texture-pack-details-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TexturePackDetailsFormComponent {
  readonly form = input.required<FormGroup<TexturePackDetailsFormControls>>();
  readonly saving = input(false);

  readonly submitted = output<void>();
}
