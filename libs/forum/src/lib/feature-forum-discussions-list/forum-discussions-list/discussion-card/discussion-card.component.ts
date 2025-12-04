import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DateDiffPipe, SvgComponent } from '@wm/common-ui';
import { Discussion } from '@wm/data-access/forum';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'wm-discussion-card',
  imports: [SvgComponent, RouterLink, DateDiffPipe],
  templateUrl: './discussion-card.component.html',
  styleUrl: './discussion-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscussionCardComponent {
  discussion = input.required<Discussion>();
}
