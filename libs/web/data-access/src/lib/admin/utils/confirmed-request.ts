import { filter, switchMap, type Observable } from 'rxjs';

/**
 * Запускает запрос только после положительного подтверждения.
 * Фабрика вызывается при подтверждении, а не при создании потока.
 */
export function confirmedRequest<T>(
  confirmation: Observable<boolean | undefined>,
  request: () => Observable<T>,
) {
  return confirmation.pipe(
    filter((confirmed) => confirmed === true),
    switchMap(() => request()),
  );
}
