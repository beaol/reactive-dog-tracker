import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parse,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';

import type { DateKey, TimeOfDay } from './types';

/** Weeks start on Monday throughout the app. */
export const WEEK_STARTS_ON = 1 as const;

export function toDateKey(date: Date): DateKey {
  return format(date, 'yyyy-MM-dd');
}

/** Parse a `YYYY-MM-DD` key as a *local* date at midnight. */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

export function addDaysKey(key: DateKey, days: number): DateKey {
  return toDateKey(addDays(fromDateKey(key), days));
}

export function compareTime(a: TimeOfDay, b: TimeOfDay): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function nowTime(now: Date = new Date()): TimeOfDay {
  return format(now, 'HH:mm');
}

export function formatTime(time: TimeOfDay): string {
  return format(parse(time, 'HH:mm', new Date(2000, 0, 1)), 'p');
}

export function weekdayOf(key: DateKey): number {
  return fromDateKey(key).getDay();
}

export type PeriodKind = 'week' | 'month' | 'year';

export interface Period {
  kind: PeriodKind;
  start: DateKey;
  end: DateKey;
}

export function periodContaining(kind: PeriodKind, anchor: DateKey): Period {
  const d = fromDateKey(anchor);
  switch (kind) {
    case 'week':
      return {
        kind,
        start: toDateKey(startOfWeek(d, { weekStartsOn: WEEK_STARTS_ON })),
        end: toDateKey(endOfWeek(d, { weekStartsOn: WEEK_STARTS_ON })),
      };
    case 'month':
      return { kind, start: toDateKey(startOfMonth(d)), end: toDateKey(endOfMonth(d)) };
    case 'year':
      return { kind, start: toDateKey(startOfYear(d)), end: toDateKey(endOfYear(d)) };
  }
}

export function shiftPeriod(period: Period, steps: number): Period {
  const d = fromDateKey(period.start);
  const shifted =
    period.kind === 'week'
      ? addWeeks(d, steps)
      : period.kind === 'month'
        ? addMonths(d, steps)
        : addYears(d, steps);
  return periodContaining(period.kind, toDateKey(shifted));
}

export function periodLabel(period: Period): string {
  const s = fromDateKey(period.start);
  const e = fromDateKey(period.end);
  switch (period.kind) {
    case 'week':
      return s.getMonth() === e.getMonth()
        ? `${format(s, 'MMM d')} – ${format(e, 'd, yyyy')}`
        : `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`;
    case 'month':
      return format(s, 'MMMM yyyy');
    case 'year':
      return format(s, 'yyyy');
  }
}

export function daysInRange(start: DateKey, end: DateKey): DateKey[] {
  return eachDayOfInterval({ start: fromDateKey(start), end: fromDateKey(end) }).map(toDateKey);
}

/** The Monday-first week strip containing `key`. */
export function weekOf(key: DateKey): DateKey[] {
  const p = periodContaining('week', key);
  return daysInRange(p.start, p.end);
}
