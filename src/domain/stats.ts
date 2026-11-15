import { addDays, differenceInCalendarDays, format } from 'date-fns';

import { daysInRange, fromDateKey, type Period, shiftPeriod } from './dates';
import type { DateKey, Marker, Trigger, Walk } from './types';

/**
 * How reactive episodes are aggregated per time bucket:
 * - `walks`: number of walks with at least one reaction ("did it happen?")
 * - `sum`:   total of intensity rankings
 * - `mean`:  average intensity ranking (null when there were no reactions)
 */
export type ReactiveMetric = 'walks' | 'sum' | 'mean';

export const REACTIVE_METRICS: { value: ReactiveMetric; label: string; unit: string }[] = [
  { value: 'walks', label: 'Reactions', unit: 'walks with a reaction' },
  { value: 'sum', label: 'Intensity sum', unit: 'sum of intensity' },
  { value: 'mean', label: 'Avg intensity', unit: 'average intensity (1–10)' },
];

export interface Bucket {
  key: string;
  /** Axis label ("Mon", "14", "Jan"). */
  label: string;
  /** Tooltip label ("Mon, Nov 14"). */
  longLabel: string;
  start: DateKey;
  end: DateKey;
}

export interface BucketStats {
  bucket: Bucket;
  reactiveCount: number;
  reactiveWalks: number;
  intensitySum: number;
  intensityMean: number | null;
  successCount: number;
}

export function buildBuckets(period: Period): Bucket[] {
  if (period.kind === 'year') {
    const year = fromDateKey(period.start).getFullYear();
    return Array.from({ length: 12 }, (_, m) => {
      const start = new Date(year, m, 1);
      const end = new Date(year, m + 1, 0);
      return {
        key: format(start, 'yyyy-MM'),
        label: format(start, 'MMMMM'),
        longLabel: format(start, 'MMMM yyyy'),
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      };
    });
  }
  return daysInRange(period.start, period.end).map((day) => {
    const d = fromDateKey(day);
    return {
      key: day,
      label: period.kind === 'week' ? format(d, 'EEEEE') : format(d, 'd'),
      longLabel: format(d, 'EEE, MMM d'),
      start: day,
      end: day,
    };
  });
}

interface DatedMarker extends Marker {
  date: DateKey;
}

function datedMarkers(
  walks: Walk[],
  markers: Marker[],
  period: Period,
  triggerIds?: ReadonlySet<string>,
): DatedMarker[] {
  const walkDate = new Map(walks.map((w) => [w.id, w.date]));
  const out: DatedMarker[] = [];
  for (const m of markers) {
    const date = walkDate.get(m.walkId);
    if (!date || date < period.start || date > period.end) continue;
    if (triggerIds && !triggerIds.has(m.triggerId)) continue;
    out.push({ ...m, date });
  }
  return out;
}

function aggregate(bucket: Bucket, markers: DatedMarker[]): BucketStats {
  let reactiveCount = 0;
  let intensitySum = 0;
  let successCount = 0;
  const reactiveWalkIds = new Set<string>();
  for (const m of markers) {
    if (m.kind === 'reactive') {
      reactiveCount++;
      intensitySum += m.intensity ?? 0;
      reactiveWalkIds.add(m.walkId);
    } else {
      successCount++;
    }
  }
  return {
    bucket,
    reactiveCount,
    reactiveWalks: reactiveWalkIds.size,
    intensitySum,
    intensityMean: reactiveCount ? intensitySum / reactiveCount : null,
    successCount,
  };
}

export interface TrendInput {
  period: Period;
  walks: Walk[];
  markers: Marker[];
  /** Restrict to these triggers. Undefined = all triggers. */
  triggerIds?: ReadonlySet<string>;
}

export function computeTrend({ period, walks, markers, triggerIds }: TrendInput): BucketStats[] {
  const buckets = buildBuckets(period);
  const relevant = datedMarkers(walks, markers, period, triggerIds);
  const byBucket = new Map<string, DatedMarker[]>(buckets.map((b) => [b.key, []]));
  for (const m of relevant) {
    const key = period.kind === 'year' ? m.date.slice(0, 7) : m.date;
    byBucket.get(key)?.push(m);
  }
  return buckets.map((b) => aggregate(b, byBucket.get(b.key) ?? []));
}

export function metricValue(stats: BucketStats, metric: ReactiveMetric): number | null {
  switch (metric) {
    case 'walks':
      return stats.reactiveWalks;
    case 'sum':
      return stats.intensitySum;
    case 'mean':
      return stats.intensityMean;
  }
}

export interface PeriodSummary {
  reactiveCount: number;
  reactiveWalks: number;
  intensitySum: number;
  meanIntensity: number | null;
  successCount: number;
  /** successes / (successes + reactions); null when nothing was logged. */
  successShare: number | null;
}

export function summarize(input: TrendInput): PeriodSummary {
  const relevant = datedMarkers(input.walks, input.markers, input.period, input.triggerIds);
  const all = aggregate(
    { key: 'all', label: '', longLabel: '', start: input.period.start, end: input.period.end },
    relevant,
  );
  const total = all.reactiveCount + all.successCount;
  return {
    reactiveCount: all.reactiveCount,
    reactiveWalks: all.reactiveWalks,
    intensitySum: all.intensitySum,
    meanIntensity: all.intensityMean,
    successCount: all.successCount,
    successShare: total ? all.successCount / total : null,
  };
}

export interface PeriodComparison {
  current: PeriodSummary;
  previous: PeriodSummary;
}

/**
 * Compares a period with the one before it. When the current period is still
 * in progress (`asOf` falls inside it), the previous period is cut to the same
 * elapsed length — so "14 days into November" is compared with the first 14
 * days of October, not all of October. Partial periods never look worse just
 * because they aren't finished yet.
 */
export function compareWithPrevious(input: TrendInput, asOf?: DateKey): PeriodComparison {
  const prev = shiftPeriod(input.period, -1);
  let prevEnd = prev.end;
  let currentEnd = input.period.end;
  if (asOf && asOf >= input.period.start && asOf <= input.period.end) {
    currentEnd = asOf;
    const elapsed = differenceInCalendarDays(fromDateKey(asOf), fromDateKey(input.period.start));
    const cut = format(addDays(fromDateKey(prev.start), elapsed), 'yyyy-MM-dd');
    if (cut < prevEnd) prevEnd = cut;
  }
  return {
    current: summarize({ ...input, period: { ...input.period, end: currentEnd } }),
    previous: summarize({ ...input, period: { ...prev, end: prevEnd } }),
  };
}

export interface TriggerBreakdownRow {
  trigger: Trigger;
  summary: PeriodSummary;
  trend: BucketStats[];
}

/** Per-trigger totals and series for the period, most active first. */
export function triggerBreakdown(
  period: Period,
  walks: Walk[],
  markers: Marker[],
  triggers: Trigger[],
): TriggerBreakdownRow[] {
  return triggers
    .map((trigger) => {
      const input = { period, walks, markers, triggerIds: new Set([trigger.id]) };
      return { trigger, summary: summarize(input), trend: computeTrend(input) };
    })
    .filter((row) => !row.trigger.archived || row.summary.reactiveCount + row.summary.successCount > 0)
    .sort(
      (a, b) =>
        b.summary.reactiveCount + b.summary.successCount -
        (a.summary.reactiveCount + a.summary.successCount),
    );
}
