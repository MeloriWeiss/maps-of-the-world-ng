import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { ToastBaseComponent } from '../toast-base/toast-base.component';
import { ToastComponent } from '../toast.interface';

@Component({
  selector: 'wm-success-toast',
  imports: [ToastBaseComponent],
  templateUrl: './success-toast.component.html',
  styleUrl: './success-toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('toastAnim', [
      state('hidden', style({ opacity: 0, transform: 'translateY(16px)' })),
      state('visible', style({ opacity: 1, transform: 'translateY(0)' })),
      transition('hidden => visible', [animate('200ms ease-out')]),
      transition('visible => hidden', [animate('150ms ease-in')]),
    ]),
  ],
})
export class SuccessToastComponent implements ToastComponent {
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
