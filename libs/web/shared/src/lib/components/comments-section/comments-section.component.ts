import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { CommentComponent, CommentInputComponent } from '@wm/web/common-ui';
import { ReactiveFormsModule } from '@angular/forms';
import { CommentItem } from '@wm/web/data-access/shared';

@Component({
  selector: 'wm-comments-section',
  imports: [ReactiveFormsModule, CommentInputComponent, CommentComponent],
  templateUrl: './comments-section.component.html',
  styleUrl: './comments-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentsSectionComponent {
  comments = input<CommentItem[] | null | undefined>([]);
  commentCreated = output<{ comment: string; parentId?: number }>();
  replyTo = signal<number | null>(null);

  submit(comment: string) {
    const parentId = this.replyTo() ?? undefined;
    this.commentCreated.emit({ comment, ...(parentId ? { parentId } : {}) });
    this.replyTo.set(null);
  }
}
