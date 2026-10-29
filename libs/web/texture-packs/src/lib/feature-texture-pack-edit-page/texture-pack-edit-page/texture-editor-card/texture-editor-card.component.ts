import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { SvgComponent } from '@wm/web/common-ui';
import type { TextureCard } from '../../../interfaces/texture-card';

/**
 * Карточка текстуры в галерее редактора: превью, размер и доступные действия.
 *
 * Блокировки приходят от родительской страницы. События передают выбранную
 * текстуру, не изменяя её и не обращаясь к API.
 */
@Component({
  selector: 'wm-texture-editor-card',
  imports: [SvgComponent],
  templateUrl: './texture-editor-card.component.html',
  styleUrl: './texture-editor-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextureEditorCardComponent {
  readonly texture = input.required<TextureCard>();
  readonly moveLabel = input.required<string>();
  readonly deletingDisabled = input(false);
  readonly moving = input(false);

  readonly removed = output<TextureCard>();
  readonly moved = output<TextureCard>();
}
