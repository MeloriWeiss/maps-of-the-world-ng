import { DestroyRef, inject, signal, Signal } from '@angular/core';

/** Состояние и операции временного сообщения интерфейса. */
export interface TransientMessage {
  value: Signal<string>;
  show(message: string, durationMs?: number): void;
  clear(): void;
}

/** Создаёт реактивное состояние временного сообщения с автоматическим закрытием. */
export function createTransientMessage(
  defaultDurationMs = 3_500,
): TransientMessage {
  const destroyRef = inject(DestroyRef);
  const value = signal('');
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
  };

  const clear = () => {
    clearTimer();
    value.set('');
  };

  destroyRef.onDestroy(clearTimer);

  return {
    value: value.asReadonly(),
    show(message: string, durationMs = defaultDurationMs) {
      clearTimer();
      value.set(message);
      if (durationMs <= 0) return;
      timer = setTimeout(clear, durationMs);
    },
    clear,
  };
}
