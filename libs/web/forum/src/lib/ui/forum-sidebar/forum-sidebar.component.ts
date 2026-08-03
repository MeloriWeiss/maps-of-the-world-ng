import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SvgComponent } from '@wm/web/common-ui';
import { ForumCategory } from '@wm/web/data-access/forum';

@Component({
  selector: 'wm-forum-sidebar',
  imports: [RouterLink, SvgComponent],
  templateUrl: './forum-sidebar.component.html',
  styleUrl: './forum-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumSidebarComponent {
  categories = input<ForumCategory[]>([]);
  selectedCategory = input<string | null>(null);
  createRequested = output();
}
