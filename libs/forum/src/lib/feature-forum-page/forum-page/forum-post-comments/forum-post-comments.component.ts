import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SvgComponent } from '@wm/common-ui';

@Component({
  selector: 'wm-forum-post-comments',
  imports: [SvgComponent],
  templateUrl: './forum-post-comments.component.html',
  styleUrl: './forum-post-comments.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumPostCommentsComponent {}
