import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { SvgComponent } from '@wm/web/common-ui';
import { DateDiffPipe } from '@wm/web/common-ui';

@Component({
  selector: 'wm-forum-post',
  imports: [SvgComponent, DateDiffPipe],
  templateUrl: './forum-post.component.html',
  styleUrl: './forum-post.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumPostComponent {
  title = input.required<string>();
  post = input.required<string>();
  author = input.required<string>();
  createdAt = input.required<string>();
  likesCount = input.required<number>();
  isLiked = input.required<boolean>();
  canLike = input.required<boolean>();
  likeRequested = output();
}
