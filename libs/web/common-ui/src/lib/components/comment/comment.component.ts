import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SvgComponent } from '../index';
import { CommentItem } from '@wm/web/data-access/shared';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'wm-comment',
  imports: [SvgComponent, DatePipe],
  templateUrl: './comment.component.html',
  styleUrl: './comment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentComponent {
  comment = input.required<CommentItem>();
  depth = input.required<number>();
}
