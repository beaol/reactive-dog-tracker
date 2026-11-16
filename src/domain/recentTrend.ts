import { addDaysKey } from './dates';
import { type PeriodSummary, summarize } from './stats';
import type { DateKey, Marker, Walk } from './types';

/**
 * The latest trend: the last 14 days compared with the 14 days before.
 *
 * Two-week windows smooth out single good or bad walks, while still reacting
 * within days to a real change. Every signal needs a minimum amount of data
 * and a meaningful difference, so one extra marker never flips the message
 * from "harder" to "better".
 */

export const TREND_WINDOW_DAYS = 14;

export type TrendSignal =
  | 'moreSuccesses'
  | 'higherSuccessShare'
  | 'softerReactions'
  | 'fewerReactions'
  | 'moreReactions'
  | 'strongerReactions';

export type TrendDirection =
  /** Nothing logged in the last two weeks. */
  | 'none'
  /** Logged recently, but nothing to compare with yet. */
  | 'new'
  | 'improving'
  | 'harder'
  | 'mixed'
  | 'steady';

export interface RecentTrend {
  direction: TrendDirection;
  current: PeriodSummary;
  previous: PeriodSummary;
  /** Better signals first, most meaningful first. */
  improving: TrendSignal[];
  harder: TrendSignal[];
}

export function recentTrend(walks: Walk[], markers: Marker[], today: DateKey): RecentTrend {
  const window = (endOffset: number) => ({
    // `kind` is irrelevant for a summary; only start and end are used.
    kind: 'week' as const,
    start: addDaysKey(today, -(endOffset + TREND_WINDOW_DAYS - 1)),
    end: addDaysKey(today, -endOffset),
  });
  const current = summarize({ period: window(0), walks, markers });
  const previous = summarize({ period: window(TREND_WINDOW_DAYS), walks, markers });

  const curN = current.reactiveCount + current.successCount;
  const prevN = previous.reactiveCount + previous.successCount;
  const base = { current, previous, improving: [] as TrendSignal[], harder: [] as TrendSignal[] };
  if (curN === 0) return { ...base, direction: 'none' };
  if (prevN === 0) return { ...base, direction: 'new' };

  const improving: TrendSignal[] = [];
  const harder: TrendSignal[] = [];

  if (current.successCount >= 2 && current.successCount >= previous.successCount + 2) improving.push('moreSuccesses');
  if (
    curN >= 3 && prevN >= 3 &&
    current.successShare !== null && previous.successShare !== null &&
    current.successShare >= previous.successShare + 0.15
  ) {
    improving.push('higherSuccessShare');
  }

  const bothReacted = current.reactiveCount >= 2 && previous.reactiveCount >= 2;
  if (bothReacted && current.meanIntensity !== null && previous.meanIntensity !== null) {
    if (current.meanIntensity <= previous.meanIntensity - 1) improving.push('softerReactions');
    if (current.meanIntensity >= previous.meanIntensity + 1) harder.push('strongerReactions');
  }

  const rDiff = current.reactiveCount - previous.reactiveCount;
  if (previous.reactiveCount >= 3 && rDiff <= -2 && current.reactiveCount <= previous.reactiveCount * 0.75) {
    improving.push('fewerReactions');
  }
  if (current.reactiveCount >= 3 && rDiff >= 2 && current.reactiveCount >= previous.reactiveCount * 1.25) {
    harder.push('moreReactions');
  }

  const direction: TrendDirection =
    improving.length && harder.length ? 'mixed' : improving.length ? 'improving' : harder.length ? 'harder' : 'steady';
  return { ...base, direction, improving, harder };
}
