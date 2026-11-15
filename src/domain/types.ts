/**
 * Core domain model for Reactive Dog Tracker.
 *
 * Design notes
 * ------------
 * - Every record that belongs to a dog lives inside that dog's `DogData`
 *   document. Dog profiles therefore never share triggers, schedules, walks or
 *   markers, and a profile can be deleted by dropping a single document.
 * - Recurring walks are stored as *rules* (`WalkSchedule`). The calendar
 *   expands rules into virtual occurrences on the fly. An occurrence is only
 *   "materialised" into a `Walk` record once the user interacts with it
 *   (adds a marker, skips it, writes a note). This keeps storage tiny and lets
 *   schedule edits flow through to every untouched occurrence automatically.
 * - Dates are stored as local calendar keys (`YYYY-MM-DD`) rather than
 *   timestamps, so a walk on "Tuesday" stays on Tuesday regardless of time
 *   zone changes or DST.
 */

/** Local calendar date, formatted `YYYY-MM-DD`. */
export type DateKey = string;

/** Local wall-clock time, formatted `HH:mm` (24h). */
export type TimeOfDay = string;

/** 0 = Sunday … 6 = Saturday (matches `Date#getDay`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Dog {
  id: string;
  name: string;
  /** Free-text breed as typed by the user ("lab mix", "Border Collie"...). */
  breed: string;
  /** Index into the breed's coat variants (e.g. yellow / black / chocolate lab). */
  coatVariant: number;
  createdAt: string;
}

export interface Trigger {
  id: string;
  name: string;
  emoji: string;
  /** Index into the categorical trigger palette (fixed per trigger, never re-cycled). */
  colorIndex: number;
  createdAt: string;
  /** Archived triggers keep their history but are hidden from pickers. */
  archived?: boolean;
}

export type Recurrence =
  | { kind: 'daily' }
  | { kind: 'weekly'; weekdays: Weekday[] };

export interface WalkSchedule {
  id: string;
  title: string;
  time: TimeOfDay;
  recurrence: Recurrence;
  startDate: DateKey;
  /** Inclusive. Undefined = repeats forever. */
  endDate?: DateKey;
  createdAt: string;
}

export interface Walk {
  id: string;
  date: DateKey;
  time: TimeOfDay;
  title: string;
  /** Set when this walk is a materialised occurrence of a schedule. */
  scheduleId?: string;
  skipped?: boolean;
  notes?: string;
  createdAt: string;
}

export type MarkerKind = 'reactive' | 'success';

/** What the dog did instead of reacting. */
export type SuccessResponse = 'looked_away' | 'checked_in' | 'sniffed' | 'other';

export interface Marker {
  id: string;
  walkId: string;
  triggerId: string;
  kind: MarkerKind;
  /** 1–10, reactive markers only. */
  intensity?: number;
  /** Success markers only. */
  response?: SuccessResponse;
  note?: string;
  createdAt: string;
}

export interface DogData {
  schemaVersion: number;
  triggers: Trigger[];
  schedules: WalkSchedule[];
  walks: Walk[];
  markers: Marker[];
}

export const CURRENT_SCHEMA_VERSION = 1;

export function emptyDogData(): DogData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    triggers: [],
    schedules: [],
    walks: [],
    markers: [],
  };
}

/**
 * A walk as shown on the calendar: either a stored `Walk` or a virtual
 * occurrence of a schedule that hasn't been touched yet.
 */
export interface WalkOccurrence {
  /** Stable key usable in routes: a walk id, or `sched~<scheduleId>~<date>`. */
  key: string;
  date: DateKey;
  time: TimeOfDay;
  title: string;
  scheduleId?: string;
  walkId?: string;
  skipped: boolean;
  notes?: string;
}

export const SUCCESS_RESPONSES: { value: SuccessResponse; label: string; emoji: string }[] = [
  { value: 'looked_away', label: 'Looked away', emoji: '👀' },
  { value: 'checked_in', label: 'Checked in with me', emoji: '🤝' },
  { value: 'sniffed', label: 'Sniffed the ground', emoji: '👃' },
  { value: 'other', label: 'Did something else', emoji: '✨' },
];

/** Plain-language anchors for the 1–10 reactivity scale. */
export const INTENSITY_ANCHORS: Record<number, string> = {
  1: 'Stiff body, not responsive — no barking or growling',
  2: 'Stiff and staring, slow to respond',
  3: 'Fixated, maybe a low grumble',
  4: 'Whining or a quiet growl',
  5: 'A few barks or growls',
  6: 'Repeated barking, pulling',
  7: 'Lunging with barking',
  8: 'Intense barking and lunging',
  9: 'Very hard to redirect, lots of noise',
  10: 'Barked or growled a lot — fully over threshold',
};
