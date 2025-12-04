import { Pipe, PipeTransform } from '@angular/core';
import { DateUtil } from '../utils';
import { DateTime } from 'luxon';

@Pipe({
  name: 'dateDiff',
  standalone: true,
})
export class DateDiffPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

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
          createdAt.get('minute')
        ) +
        ' ' +
        DateUtil.createCorrectDateString(
          '.',
          createdAt.get('day'),
          createdAt.get('month'),
          createdAt.get('year')
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
      Math.ceil(seconds)
    )} назад`;
  }
}
