import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'wm-auth-submit-button',
  imports: [],
  templateUrl: './auth-submit-button.component.html',
  styleUrl: './auth-submit-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthSubmitButtonComponent {
  text = input.required<string>()
}
