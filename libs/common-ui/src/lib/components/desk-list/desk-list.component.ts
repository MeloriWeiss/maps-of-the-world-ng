import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { PaginationComponent } from '../index';

@Component({
  selector: 'wm-desk-list',
  imports: [ReactiveFormsModule, PaginationComponent],
  templateUrl: './desk-list.component.html',
  styleUrl: './desk-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeskListComponent {
  pageable = input(true);
  title = input<string>();
}
