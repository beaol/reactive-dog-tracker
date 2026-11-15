import { describeRecurrence, occurrencesOn, parseOccurrenceKey, resolveOccurrence, scheduleOccursOn, virtualKey } from '../schedule';
import type { Walk, WalkSchedule } from '../types';

const morning: WalkSchedule = {
  id: 's1',
  title: 'Morning walk',
  time: '07:30',
  recurrence: { kind: 'daily' },
  startDate: '2026-11-01',
  createdAt: '',
};

const weekendHike: WalkSchedule = {
  id: 's2',
  title: 'Weekend hike',
  time: '10:00',
  recurrence: { kind: 'weekly', weekdays: [0, 6] },
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  createdAt: '',
};

describe('schedule expansion', () => {
  it('respects start and end dates', () => {
    expect(scheduleOccursOn(morning, '2026-10-31')).toBe(false);
    expect(scheduleOccursOn(morning, '2026-11-01')).toBe(true);
    expect(scheduleOccursOn(weekendHike, '2026-12-05')).toBe(false);
  });

  it('only repeats weekly schedules on the chosen weekdays', () => {
    // 2026-11-14 is a Saturday, 2026-11-16 a Monday
    expect(scheduleOccursOn(weekendHike, '2026-11-14')).toBe(true);
    expect(scheduleOccursOn(weekendHike, '2026-11-16')).toBe(false);
  });

  it('merges virtual occurrences with stored walks, sorted by time', () => {
    const extra: Walk = { id: 'w1', date: '2026-11-14', time: '18:00', title: 'Evening sniffari', createdAt: '' };
    const list = occurrencesOn('2026-11-14', [weekendHike, morning], [extra]);
    expect(list.map((o) => o.title)).toEqual(['Morning walk', 'Weekend hike', 'Evening sniffari']);
    expect(list[0].key).toBe(virtualKey('s1', '2026-11-14'));
    expect(list[0].walkId).toBeUndefined();
  });

  it('a materialised walk replaces its virtual occurrence', () => {
    const mat: Walk = { id: 'w2', date: '2026-11-14', time: '07:45', title: 'Morning walk', scheduleId: 's1', createdAt: '' };
    const list = occurrencesOn('2026-11-14', [morning], [mat]);
    expect(list).toHaveLength(1);
    expect(list[0].walkId).toBe('w2');
    expect(list[0].time).toBe('07:45');
  });

  it('resolves virtual keys, including after materialisation', () => {
    const key = virtualKey('s1', '2026-11-14');
    expect(parseOccurrenceKey(key)).toEqual({ kind: 'virtual', scheduleId: 's1', date: '2026-11-14' });
    expect(resolveOccurrence(key, [morning], [])?.title).toBe('Morning walk');
    const mat: Walk = { id: 'w3', date: '2026-11-14', time: '07:30', title: 'Morning walk', scheduleId: 's1', createdAt: '' };
    expect(resolveOccurrence(key, [morning], [mat])?.walkId).toBe('w3');
    expect(resolveOccurrence(virtualKey('gone', '2026-11-14'), [morning], [])).toBeUndefined();
  });

  it('describes recurrences in plain language', () => {
    expect(describeRecurrence({ kind: 'daily' })).toBe('Every day');
    expect(describeRecurrence({ kind: 'weekly', weekdays: [1, 2, 3, 4, 5] })).toBe('Weekdays');
    expect(describeRecurrence({ kind: 'weekly', weekdays: [6, 0] })).toBe('Weekends');
    expect(describeRecurrence({ kind: 'weekly', weekdays: [3, 1] })).toBe('Mon, Wed');
  });
});
