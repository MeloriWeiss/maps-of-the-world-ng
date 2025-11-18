import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SvgComponent } from '@wm/common-ui';
import { Discussion } from '@wm/data-access/forum';

@Component({
  selector: 'wm-discussion-card',
  imports: [
    SvgComponent
  ],
  templateUrl: './discussion-card.component.html',
  styleUrl: './discussion-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiscussionCardComponent {
  discussion = input.required<Discussion>();
}
