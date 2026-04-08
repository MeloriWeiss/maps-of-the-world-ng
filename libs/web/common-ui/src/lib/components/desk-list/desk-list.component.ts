import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  input,
  TemplateRef,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { PaginationComponent } from '../index';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'wm-desk-list',
  imports: [ReactiveFormsModule, PaginationComponent, NgTemplateOutlet],
  templateUrl: './desk-list.component.html',
  styleUrl: './desk-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeskListComponent {
  @ContentChild('sidebar', { read: TemplateRef })
  sidebarTemplate: TemplateRef<any> | null = null;

  pageable = input(true);
  title = input<string>('');
  crumbs = input<string>();
}
