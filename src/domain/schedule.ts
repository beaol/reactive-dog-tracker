import { compareTime, weekdayOf } from './dates';
import type { DateKey, Recurrence, Walk, WalkOccurrence, WalkSchedule } from './types';

const VIRTUAL_PREFIX = 'sched~';

export function virtualKey(scheduleId: string, date: DateKey): string {
  return `${VIRTUAL_PREFIX}${scheduleId}~${date}`;
}

export function parseOccurrenceKey(
  key: string,
): { kind: 'walk'; walkId: string } | { kind: 'virtual'; scheduleId: string; date: DateKey } {
  if (key.startsWith(VIRTUAL_PREFIX)) {
    const [scheduleId, date] = key.slice(VIRTUAL_PREFIX.length).split('~');
    return { kind: 'virtual', scheduleId, date };
  }
  return { kind: 'walk', walkId: key };
}

export function recursOn(recurrence: Recurrence, date: DateKey): boolean {
  if (recurrence.kind === 'daily') return true;
  return recurrence.weekdays.includes(weekdayOf(date) as never);
}

export function scheduleOccursOn(schedule: WalkSchedule, date: DateKey): boolean {
  if (date < schedule.startDate) return false;
  if (schedule.endDate && date > schedule.endDate) return false;
  return recursOn(schedule.recurrence, date);
}

function walkToOccurrence(walk: Walk): WalkOccurrence {
  return {
    key: walk.id,
    date: walk.date,
    time: walk.time,
    title: walk.title,
    scheduleId: walk.scheduleId,
    walkId: walk.id,
    skipped: !!walk.skipped,
    notes: walk.notes,
  };
}

/**
 * All walks on a given day: stored walks plus untouched schedule occurrences.
 * A stored walk with a `scheduleId` *replaces* that schedule's occurrence for
 * its date, so occurrences are never duplicated.
 */
export function occurrencesOn(
  date: DateKey,
  schedules: WalkSchedule[],
  walks: Walk[],
): WalkOccurrence[] {
  const stored = walks.filter((w) => w.date === date);
  const materialised = new Set(stored.filter((w) => w.scheduleId).map((w) => w.scheduleId));

  const virtual: WalkOccurrence[] = schedules
    .filter((s) => !materialised.has(s.id) && scheduleOccursOn(s, date))
    .map((s) => ({
      key: virtualKey(s.id, date),
      date,
      time: s.time,
      title: s.title,
      scheduleId: s.id,
      skipped: false,
    }));

  return [...stored.map(walkToOccurrence), ...virtual].sort(
    (a, b) => compareTime(a.time, b.time) || a.title.localeCompare(b.title),
  );
}

/** Resolve a route key to the occurrence it points at (or undefined if gone). */
export function resolveOccurrence(
  key: string,
  schedules: WalkSchedule[],
  walks: Walk[],
): WalkOccurrence | undefined {
  const parsed = parseOccurrenceKey(key);
  if (parsed.kind === 'walk') {
    const walk = walks.find((w) => w.id === parsed.walkId);
    return walk && walkToOccurrence(walk);
  }
  // A virtual key may have been materialised since the route was opened.
  const stored = walks.find((w) => w.scheduleId === parsed.scheduleId && w.date === parsed.date);
  if (stored) return walkToOccurrence(stored);
  const schedule = schedules.find((s) => s.id === parsed.scheduleId);
  if (!schedule || !scheduleOccursOn(schedule, parsed.date)) return undefined;
  return {
    key,
    date: parsed.date,
    time: schedule.time,
    title: schedule.title,
    scheduleId: schedule.id,
    skipped: false,
  };
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function describeRecurrence(recurrence: Recurrence): string {
  if (recurrence.kind === 'daily') return 'Every day';
  const days = [...recurrence.weekdays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return days.map((d) => WEEKDAY_SHORT[d]).join(', ');
}
