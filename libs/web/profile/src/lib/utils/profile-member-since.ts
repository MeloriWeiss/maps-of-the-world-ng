const monthNames = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/**
 * Формирует подпись месяца и года регистрации в локальном часовом поясе.
 * Пустая дата означает, что сводка профиля ещё не загружена.
 */
export function formatProfileMemberSince(createdAt: string): string {
  if (!createdAt) return '';

  const date = new Date(createdAt);

  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}
