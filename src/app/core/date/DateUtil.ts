import { formatDate } from '@angular/common';

export type ValidDate = Date | number | string;

export class DateUtil {
  /** Time constants */
  static readonly MINUTE = 60000;
  static readonly HOUR = 3600000;
  static readonly DAY = 86400000;

  /** The app's datetime format. custom message for invalid date */
  static ToAppDate(
    d?: ValidDate | null,
    invalid: string = '',
    dateOnly: boolean = false
  ): string {
    try {
      let format = 'dd/MM/yyyy';
      if (!dateOnly) {
        format += ' HH:mm';
      }
      return d ? formatDate(new Date(d), format, 'he') : invalid;
    } catch (e) {
      return invalid;
    }
  }

  static ToTimeString(d?: ValidDate | null, invalid: string = '') {
    try {
      return formatDate(d!, 'HH:mm', 'he');
    } catch (e) {
      return invalid;
    }
  }

  /** Check whether two times are on the same day */
  static IsSameDay(d1: ValidDate, d2: ValidDate): boolean {
    return (
      new Date(d1).toLocaleDateString() === new Date(d2).toLocaleDateString()
    );
  }

  /** Whether some time is on the same day as today */
  static IsToday(d: ValidDate): boolean {
    return this.IsSameDay(d, Date.now());
  }

  /** Number of (full) days between two dates */
  static DaysGap(d1: ValidDate, d2: ValidDate): number {
    d1 = new Date(d1);
    d2 = new Date(d2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const gap = +d1 - +d2;
    return Math.floor(gap / DateUtil.DAY);
  }

  static DaysFromToday(d: ValidDate): number {
    return this.DaysGap(Date.now(), d);
  }

  /** Get list of dates containing the first day of each month of the current (or given) year */
  static GetMonths(date: Date = new Date()) {
    const m: Date[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(date);
      d.setMonth(i, 1);
      d.setHours(0, 0, 0, 0);
      m.push(d);
    }
    return m;
  }

  /** Get the number of days of the given month (of the current year if not specified) */
  static DaysInMonth(month: number, year?: number): number {
    const d = new Date();
    if (year) {
      d.setFullYear(year);
    }
    d.setMonth(month + 1, 0);
    return d.getDate();
  }

  static MonthDates(date: ValidDate) {
    const d = new Date(date);
    const month = d.getMonth();
    d.setDate(1);
    const dates: number[] = [];
    while (d.getMonth() === month) {
      dates.push(+d);
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }

  static DaysBack(daysBack: number, from: ValidDate = Date.now()) {
    const d = new Date(from);
    d.setHours(0, 0, 0, 0);
    return d.setDate(d.getDate() - daysBack);
  }

  static StartOfMonth(date: ValidDate = Date.now()) {
    const d = new Date(date);
    d.setDate(1);
    return d.setHours(0, 0, 0, 0);
  }

  // The last moment of the given month
  static EndOfMonth(date: ValidDate = Date.now()) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1, 1);
    return d.setHours(0, 0, 0, -1);
  }

  static StartOfYear(date: ValidDate = Date.now()) {
    const d = new Date(date);
    d.setMonth(0);
    d.setDate(1);
    return d.setHours(0, 0, 0, 0);
  }

  // The last moment of the given month
  static EndOfYear(date: ValidDate = Date.now()) {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + 1, 0, 1);
    return d.setHours(0, 0, 0, -1);
  }

  static IsSameYear(date1: ValidDate, date2: ValidDate) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear();
  }

  static IsSameMonth(date1: ValidDate, date2: ValidDate) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()
    );
  }

  static IsSameMonthUTC(date1: ValidDate, date2: ValidDate) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getUTCFullYear() === d2.getUTCFullYear() &&
      d1.getUTCMonth() === d2.getUTCMonth()
    );
  }

  /**
   * Convert a date-like value to an ISO string at UTC midnight (00:00:00.000Z)
   * using the local year/month/day components of the provided date.
   * Useful when a date is chosen without time and must be stored in UTC at 00:00.
   */
  static ToUtcMidnightIso(
    date: ValidDate | null | undefined
  ): string | undefined {
    if (!date && date !== 0) {
      return undefined;
    }
    const d = new Date(date as ValidDate);
    const utcMidnight = new Date(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
    );
    return utcMidnight.toISOString();
  }

  /**
   * Build a local Date from a UTC-midnight ISO string by reading its UTC Y/M/D.
   * This avoids date shifting when binding to local date pickers.
   */
  static FromUtcMidnightIso(
    date: ValidDate | { toDate: () => Date } | null | undefined
  ): Date | null {
    if (date === null || date === undefined) {
      return null;
    }

    let baseDate: Date;
    const maybeTimestamp: any = date as any;
    if (maybeTimestamp && typeof maybeTimestamp.toDate === 'function') {
      // Firebase Timestamp detected
      baseDate = maybeTimestamp.toDate();
    } else {
      baseDate = new Date(date as ValidDate);
    }

    if (Number.isNaN(baseDate.getTime())) {
      return null;
    }

    const ret = new Date(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      0,
      0,
      0,
      0
    );
    return ret;
  }
}
