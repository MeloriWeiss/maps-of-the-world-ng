import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SvgComponent } from '@wm/common-ui';

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
  discussion = input.required<any>();
}
