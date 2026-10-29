import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Отображает сообщение об ошибке и действие для повтора запроса. */
@Component({
  selector: 'wm-error',
  imports: [RouterLink],
  templateUrl: './error.component.html',
  styleUrl: './error.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorComponent {}
