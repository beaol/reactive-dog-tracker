import { periodContaining } from '../dates';
import { compareWithPrevious, computeTrend, metricValue, summarize, triggerBreakdown } from '../stats';
import type { Marker, Trigger, Walk } from '../types';

const walk = (id: string, date: string): Walk => ({ id, date, time: '08:00', title: 'Walk', createdAt: '' });
const reactive = (id: string, walkId: string, triggerId: string, intensity: number): Marker => ({
  id, walkId, triggerId, kind: 'reactive', intensity, createdAt: '',
});
const success = (id: string, walkId: string, triggerId: string): Marker => ({
  id, walkId, triggerId, kind: 'success', response: 'checked_in', createdAt: '',
});

const walks = [walk('w1', '2026-11-09'), walk('w2', '2026-11-09'), walk('w3', '2026-11-11'), walk('w0', '2026-11-03')];
const markers = [
  reactive('m1', 'w1', 'dogs', 6),
  reactive('m2', 'w1', 'dogs', 4),
  reactive('m3', 'w2', 'bikes', 2),
  success('m4', 'w3', 'dogs'),
  success('m5', 'w3', 'dogs'),
  reactive('m6', 'w0', 'dogs', 9),
];

const week = periodContaining('week', '2026-11-12'); // Mon 9 – Sun 15

describe('computeTrend', () => {
  it('builds Monday-first daily buckets for a week', () => {
    const trend = computeTrend({ period: week, walks, markers });
    expect(trend).toHaveLength(7);
    expect(trend[0].bucket.key).toBe('2026-11-09');
  });

  it('aggregates reaction walks, sum and mean per bucket', () => {
    const [monday, , wednesday] = computeTrend({ period: week, walks, markers });
    expect(monday.reactiveCount).toBe(3);
    expect(monday.reactiveWalks).toBe(2);
    expect(monday.intensitySum).toBe(12);
    expect(monday.intensityMean).toBe(4);
    expect(wednesday.successCount).toBe(2);
    expect(metricValue(wednesday, 'mean')).toBeNull();
  });

  it('filters by trigger', () => {
    const [monday] = computeTrend({ period: week, walks, markers, triggerIds: new Set(['dogs']) });
    expect(monday.reactiveWalks).toBe(1);
    expect(monday.intensityMean).toBe(5);
  });

  it('uses monthly buckets for a year', () => {
    const year = periodContaining('year', '2026-06-01');
    const trend = computeTrend({ period: year, walks, markers });
    expect(trend).toHaveLength(12);
    expect(trend[10].reactiveCount).toBe(4);
    expect(trend[10].successCount).toBe(2);
  });
});

describe('summaries', () => {
  it('computes success share', () => {
    const s = summarize({ period: week, walks, markers });
    expect(s.reactiveCount).toBe(3);
    expect(s.successCount).toBe(2);
    expect(s.successShare).toBeCloseTo(0.4);
  });

  it('compares with the previous period', () => {
    const cmp = compareWithPrevious({ period: week, walks, markers });
    expect(cmp.previous.reactiveCount).toBe(1);
    expect(cmp.previous.meanIntensity).toBe(9);
  });

  it('compares an in-progress period with the same elapsed part of the previous one', () => {
    // As of Tuesday 10th: current = Mon 9–Tue 10, previous = Mon 2–Tue 3 (excludes nothing)
    // and the reaction on Tue 3 (w0) is still counted; a marker later that week would not be.
    const later = [...walks, walk('wx', '2026-11-06')];
    const extra = [...markers, reactive('mx', 'wx', 'dogs', 5)];
    const cmp = compareWithPrevious({ period: week, walks: later, markers: extra }, '2026-11-10');
    expect(cmp.previous.reactiveCount).toBe(1);
    expect(cmp.current.successCount).toBe(0);
    const full = compareWithPrevious({ period: week, walks: later, markers: extra });
    expect(full.previous.reactiveCount).toBe(2);
  });

  it('breaks down by trigger, most active first', () => {
    const triggers: Trigger[] = [
      { id: 'bikes', name: 'Bikes', emoji: '🚲', colorIndex: 1, createdAt: '' },
      { id: 'dogs', name: 'Dogs', emoji: '🐕', colorIndex: 0, createdAt: '' },
    ];
    const rows = triggerBreakdown(week, walks, markers, triggers);
    expect(rows.map((r) => r.trigger.id)).toEqual(['dogs', 'bikes']);
    expect(rows[0].summary.successCount).toBe(2);
  });
});
