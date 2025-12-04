import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SvgComponent } from '@wm/common-ui';

@Component({
  selector: 'wm-forum-post',
  imports: [SvgComponent],
  templateUrl: './forum-post.component.html',
  styleUrl: './forum-post.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumPostComponent {}
