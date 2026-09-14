import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';

@Component({
  selector: 'wm-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src(); as url) {
      @if (failedUrl() !== url) {
        <img
          [src]="url"
          alt=""
          [attr.loading]="loading()"
          decoding="async"
          (error)="failedUrl.set(url)"
        />
      } @else {
        <span aria-hidden="true">{{ initial() }}</span>
      }
    } @else {
      <span aria-hidden="true">{{ initial() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      width: var(--avatar-size, 40px);
      height: var(--avatar-size, 40px);
      flex-shrink: 0;
      overflow: hidden;
      border-radius: 50%;
      background: var(--btn-secondary-bg-color);
      color: var(--btn-secondary-text-color);
      font:
        700 15px/1 Play,
        sans-serif;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
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
