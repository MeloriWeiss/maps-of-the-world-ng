import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  Renderer2,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SvgComponent } from '../svg/svg.component';

@Component({
  selector: 'wm-comment-input',
  imports: [ReactiveFormsModule, SvgComponent],
  templateUrl: './comment-input.component.html',
  styleUrl: './comment-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentInputComponent {
  commentControl = new FormControl('');
  placeholder = input.required<string>();

  #r2 = inject(Renderer2);

  onTextareaInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;

    this.#r2.setStyle(textarea, 'height', 'auto');
    this.#r2.setStyle(textarea, 'height', textarea.scrollHeight + 'px');
  }
}
