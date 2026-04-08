import { Pipe, PipeTransform } from '@angular/core';
import { DateUtil } from '../utils';
import { DateTime } from 'luxon';

/**
 * Пайп для форматирования разницы между текущей датой и переданной ISO-строкой.
 *
 * Выводит полную дату (ДД.ММ.ГГГГ ЧЧ:ММ) если прошло >1 дня,
 * иначе относительное время: "X часов назад", "Y минут назад" или "Z секунд назад".
 *
 * Зависимости: Luxon для DateTime, DateUtil для утилит форматирования и окончаний.
 *
 * @example
 * {{ '2023-01-01T12:00:00Z' | dateDiff }}
 * // > "01.01.2023 12:00" (если >1 день)
 *
 * @example
 * {{ '2026-03-03T11:00:00Z' | dateDiff }}
 * // > "2 часа назад"
 *
 * @param value ISO-строка даты (UTC) или null/undefined.
 * @returns Форматированная строка разницы или пустая строка при ошибке/null.
 */
@Pipe({
  name: 'dateDiff',
  standalone: true,
})
export class DateDiffPipe implements PipeTransform {
  /**
   * Transform pipe-метод для подсчёта разницы.
   *
   * @param {string} value ISO-строка даты (UTC) или null/undefined.
   * @returns {string} Форматированная строка разницы или пустая строка при ошибке/null.
   */
  transform(value: string | null | undefined): string {
    if (!value) return '';

    const now = DateTime.local();
    const createdAt = DateTime.fromISO(value, { zone: 'utc' });

    const diff = now.diff(createdAt, ['days', 'hours', 'minutes', 'seconds']);

    const { days, hours, minutes, seconds } = diff.toObject();

    if (
      days === undefined ||
      hours === undefined ||
      minutes === undefined ||
      seconds === undefined
    ) {
      return '';
    }

    if (days > 0) {
      return (
        DateUtil.createCorrectDateString(
          ':',
          createdAt.get('hour'),
          createdAt.get('minute'),
        ) +
        ' ' +
        DateUtil.createCorrectDateString(
          '.',
          createdAt.get('day'),
          createdAt.get('month'),
          createdAt.get('year'),
        )
      );
    }

    if (hours > 0) {
      return `${hours} ${DateUtil.getEndOfHoursBack(hours)} назад`;
    }

    if (minutes > 0) {
      return `${minutes} ${DateUtil.getEndOfMinutesBack(minutes)} назад`;
    }

    return `${Math.ceil(seconds)} ${DateUtil.getEndOfSecondsBack(
      Math.ceil(seconds),
    )} назад`;
  }
}
