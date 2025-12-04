import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'wm-forum-sidebar',
  imports: [RouterLinkActive, RouterLink],
  templateUrl: './forum-sidebar.component.html',
  styleUrl: './forum-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumSidebarComponent {}
