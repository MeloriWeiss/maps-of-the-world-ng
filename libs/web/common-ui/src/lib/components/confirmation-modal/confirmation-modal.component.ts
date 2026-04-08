import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnDestroy,
  output,
} from '@angular/core';
import { ModalService } from '../base-modal/modal.service';
import { BaseModalComponent } from '../base-modal/base-modal.component';
import { ModalClose } from '@wm/data-access/shared';

@Component({
  selector: 'wm-confirmation-modal',
  imports: [BaseModalComponent],
  templateUrl: './confirmation-modal.component.html',
  styleUrl: './confirmation-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationModalComponent implements ModalClose, OnDestroy {
  #modalService = inject(ModalService);

  title = input('Уверены, что хотите удалить?');
  subtitle = input('');
  agreeBtnText = input('Удалить');
  rejectBtnText = input('Отмена');

  closed = output<boolean>();

  confirm(result: boolean) {
    this.closed.emit(result);
    this.#modalService.close();
  }

  ngOnDestroy() {
    this.closed.emit(false);
  }
}
