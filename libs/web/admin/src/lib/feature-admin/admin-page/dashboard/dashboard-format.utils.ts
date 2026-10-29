import type { AnalyticsInterval } from '@wm/web/data-access/admin';

/** Преобразует дату в формат `YYYY-MM-DD` для полей фильтра. */
export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Форматирует подпись точки графика с учётом выбранного интервала. */
export function formatChartDate(value: string, interval: AnalyticsInterval) {
  const options: Intl.DateTimeFormatOptions =
    interval === 'hour'
      ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
      : interval === 'month'
        ? { month: 'short', year: 'numeric' }
        : interval === 'year'
          ? { year: 'numeric' }
          : { day: '2-digit', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat('ru-RU', options).format(new Date(value));
}

/** Возвращает русское название интервала статистики в единственном числе. */
export function intervalLabel(interval: AnalyticsInterval) {
  const labels: Record<AnalyticsInterval, string> = {
    hour: 'час',
    day: 'день',
    week: 'неделя',
    month: 'месяц',
    year: 'год',
  };
  return labels[interval];
}

/** Преобразует длительность работы сервиса в краткую строку дней, часов и минут. */
export function formatUptime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return [days && `${days} д.`, hours && `${hours} ч.`, `${minutes} мин.`]
    .filter(Boolean)
    .join(' ');
}
