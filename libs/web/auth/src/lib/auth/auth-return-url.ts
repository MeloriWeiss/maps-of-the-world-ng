/** Проверяет, что адрес возврата после авторизации ведёт только на внутренний маршрут Angular. */
export function authReturnUrl(value: string | null) {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  )
    return '/';
  return value;
}
