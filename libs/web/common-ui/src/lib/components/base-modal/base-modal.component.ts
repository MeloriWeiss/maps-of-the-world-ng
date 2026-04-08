import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
} from '@angular/core';
import { ModalService } from './modal.service';

@Component({
  selector: 'wm-base-modal',
  standalone: true,
  imports: [],
  templateUrl: './base-modal.component.html',
  styleUrl: './base-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseModalComponent {
  #modalService = inject(ModalService);

  title = input('');

  @HostListener('click', ['$event'])
  hideModal(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeModal() {
    this.#modalService.close();
  }
}
