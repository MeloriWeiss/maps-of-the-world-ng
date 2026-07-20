import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ToastBaseComponent } from '../toast-base/toast-base.component';
import { ToastComponent } from '../toast.interface';

@Component({
  selector: 'wm-info-toast',
  imports: [ToastBaseComponent],
  templateUrl: './info-toast.component.html',
  styleUrl: './info-toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoToastComponent implements ToastComponent {
  base = viewChild.required(ToastBaseComponent);

  message = input('');

  closed = output<void>();

  show() {
    this.base().setVisible();
  }

  hide(done: VoidFunction) {
    this.base().setHidden(done);
  }

  onCloseClick(event: MouseEvent) {
    event.stopPropagation();
    this.closed.emit();
  }
}
