/** Only internal Angular routes can be used after authentication. */
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
