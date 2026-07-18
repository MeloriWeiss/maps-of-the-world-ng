import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'wm-toast-base',
  imports: [],
  templateUrl: './toast-base.component.html',
  styleUrl: './toast-base.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastBaseComponent {
  open = signal(false);
  onHideCompleted: VoidFunction | null = null;

  setVisible(): void {
    this.open.set(true);
  }

  setHidden(done: VoidFunction): void {
    this.onHideCompleted = done;
    this.open.set(false);
  }

  onTransitionEnd(): void {
    if (this.open() || !this.onHideCompleted) return;

    this.onHideCompleted();
    this.onHideCompleted = null;
  }
}
