import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  DeskListComponent,
  SearchInputComponent,
  SvgComponent,
} from '@wm/web/common-ui';
import { ForumSidebarComponent } from '../../ui';
import { ForumPostComponent } from './forum-post/forum-post.component';
import { CommentsSectionComponent } from '@wm/web/web-shared';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MockService } from '@wm/web/data-access/mock';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'wm-forum-page',
  imports: [
    DeskListComponent,
    ForumSidebarComponent,
    ForumPostComponent,
    CommentsSectionComponent,
    SearchInputComponent,
    SvgComponent,
    ReactiveFormsModule,
    AsyncPipe,
  ],
  templateUrl: './forum-page.component.html',
  styleUrl: './forum-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumPageComponent {
  searchControl = new FormControl('');
  #mockService = inject(MockService);

  comments = this.#mockService.getComments();
}
