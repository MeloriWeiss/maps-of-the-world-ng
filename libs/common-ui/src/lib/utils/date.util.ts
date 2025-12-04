import { DateTime } from 'luxon';

type dateFormats = 'sql' | 'iso';

export class DateUtil {
  private static baseHours = 'час';
  private static baseMinutes = 'минут';
  private static baseSeconds = 'секунд';

  static createCorrectDateString(
    separator: string,
    ...dateParts: number[]
  ): string {
    return dateParts
      .map((part) => {
        const strPart = String(part);
        return strPart.length < 2 ? '0' + strPart : strPart;
      })
      .join(separator);
  }

  static getEndOfHoursBack(hours: number): string {
    if (hours > 4 && hours < 21) {
      return this.baseHours + 'ов';
    }
    if (hours > 1 && hours !== 21) {
      return this.baseHours + 'а';
    }
    return this.baseHours;
  }

  static getEndOfMinutesBack(minutes: number): string {
    if (
      (minutes > 4 && minutes < 21) ||
      (minutes > 24 && (minutes % 10 > 4 || minutes % 10 === 0))
    ) {
      return this.baseMinutes;
    }
    if (minutes % 10 > 1) {
      return this.baseMinutes + 'ы';
    }
    return this.baseMinutes + 'у';
  }

  static getEndOfSecondsBack(seconds: number): string {
    if (
      seconds % 10 > 4 ||
      seconds % 10 === 0 ||
      (seconds > 10 && seconds < 15)
    ) {
      return this.baseSeconds;
    }
    if (seconds % 10 > 1) {
      return this.baseSeconds + 'ы';
    }
    return this.baseSeconds + 'у';
  }

  static getFormattedDate(date: string) {
    const dateTime = this.getLocalDateTime(date);

    return DateUtil.createCorrectDateString(
      '.',
      dateTime.day,
      dateTime.month,
      dateTime.year
    );
  }

  static getFormattedToday() {
    const today = DateTime.local();
    return this.createCorrectDateString(
      '.',
      today.day,
      today.month,
      today.year
    );
  }

  static getLocalDateTime(date: string) {
    const format = this.getDateFormat(date);
    const now = DateTime.local();

    return format === 'sql'
      ? DateTime.fromSQL(date, { zone: 'utc' }).setZone(now.zone.name)
      : DateTime.fromISO(date, { zone: 'utc' }).setZone(now.zone.name);
  }

  static getDateFormat(date: string): dateFormats {
    return date.split(' ').length === 1 ? 'iso' : 'sql';
  }
}
