import {
  ChangeDetectionStrategy,
  Component,
  inject,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { ToastService } from '../toast.service';

@Component({
  selector: 'wm-toast-host',
  imports: [],
  templateUrl: './toast-host.component.html',
  styleUrl: './toast-host.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastHostComponent {
  #toastService = inject(ToastService);

  @ViewChild('toastHost', { read: ViewContainerRef })
  set modalHost(toastHost: ViewContainerRef) {
    if (!toastHost) return;

    this.#toastService.registerContainer(toastHost);
  }
}
