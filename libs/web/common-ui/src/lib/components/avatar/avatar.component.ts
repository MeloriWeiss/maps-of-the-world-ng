import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';

/** Отображает аватар пользователя или резервное изображение. */
@Component({
  selector: 'wm-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss',
})
export class AvatarComponent {
  readonly src = input<string | null | undefined>(null);
  readonly name = input('');
  readonly loading = input<'lazy' | 'eager'>('lazy');
  readonly failedUrl = signal<string | null>(null);
  readonly initial = computed(
    () => Array.from(this.name().trim())[0]?.toLocaleUpperCase() || '?',
  );
}
