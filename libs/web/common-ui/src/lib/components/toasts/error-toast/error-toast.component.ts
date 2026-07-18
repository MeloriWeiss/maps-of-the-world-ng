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
  selector: 'wm-error-toast',
  imports: [ToastBaseComponent],
  templateUrl: './error-toast.component.html',
  styleUrl: './error-toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorToastComponent implements ToastComponent {
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
