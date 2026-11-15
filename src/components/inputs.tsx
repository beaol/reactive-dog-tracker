import { addMonths, format } from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip, ChipRow, IconButton } from '@/components/ui/Controls';
import { haptic } from '@/components/ui/Button';
import { Row } from '@/components/ui/Layout';
import { T } from '@/components/ui/Typography';
import { fromDateKey, periodContaining, toDateKey, weekOf } from '@/domain/dates';
import { type DateKey, INTENSITY_ANCHORS, type TimeOfDay, type Trigger, type Weekday } from '@/domain/types';
import { intensityColor, Radius, Space, triggerTint, useTheme } from '@/theme/theme';

// ── Intensity 1–10 ────────────────────────────────────────────────────────

export function IntensityPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const theme = useTheme();
  return (
    <View style={{ gap: Space.md }}>
      <View style={styles.intensityRow} accessibilityRole="adjustable" accessibilityValue={{ min: 1, max: 10, now: value }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const selected = n === value;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`Intensity ${n}`}
              accessibilityState={{ selected }}
              onPress={() => {
                haptic();
                onChange(n);
              }}
              style={[
                styles.intensityDot,
                {
                  backgroundColor: n <= value ? intensityColor(theme, n) : theme.surfaceAlt,
                  borderColor: selected ? theme.text : 'transparent',
                  transform: [{ scale: selected ? 1.12 : 1 }],
                },
              ]}>
              <T variant="caption" style={{ fontWeight: '700', color: n <= value && n >= 7 ? '#FFFFFF' : theme.text }}>
                {n}
              </T>
            </Pressable>
          );
        })}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="caption" tone="muted">Stiff, quiet</T>
        <T variant="caption" tone="muted">Lots of barking</T>
      </Row>
      <View style={[styles.anchor, { backgroundColor: theme.surfaceAlt }]}>
        <T variant="bodyStrong">{value} · {INTENSITY_ANCHORS[value]}</T>
      </View>
    </View>
  );
}

// ── Time ──────────────────────────────────────────────────────────────────

function Stepper({ value, onDec, onInc, label }: { value: string; onDec: () => void; onInc: () => void; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stepper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <IconButton icon="−" label={`Decrease ${label}`} onPress={onDec} size={36} />
      <T variant="title" style={styles.stepperValue}>{value}</T>
      <IconButton icon="+" label={`Increase ${label}`} onPress={onInc} size={36} />
    </View>
  );
}

/** Platform-neutral time input (no native picker dependency, works on web). */
export function TimeField({ value, onChange }: { value: TimeOfDay; onChange: (v: TimeOfDay) => void }) {
  const [h, m] = value.split(':').map(Number);
  const set = (hh: number, mm: number) =>
    onChange(`${String((hh + 24) % 24).padStart(2, '0')}:${String((mm + 60) % 60).padStart(2, '0')}`);
  const presets = ['07:00', '08:00', '12:00', '17:00', '19:00', '21:00'];
  return (
    <View style={{ gap: Space.sm }}>
      <Row gap={Space.md}>
        <Stepper label="hour" value={String(h).padStart(2, '0')} onDec={() => set(h - 1, m)} onInc={() => set(h + 1, m)} />
        <T variant="title">:</T>
        <Stepper label="minutes" value={String(m).padStart(2, '0')} onDec={() => set(m - 5 < 0 ? h - 1 : h, m - 5)} onInc={() => set(m + 5 >= 60 ? h + 1 : h, m + 5)} />
      </Row>
      <ChipRow scroll>
        {presets.map((p) => (
          <Chip key={p} label={p} selected={p === value} onPress={() => onChange(p)} />
        ))}
      </ChipRow>
    </View>
  );
}

// ── Weekdays ──────────────────────────────────────────────────────────────

const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' },
  { value: 0, label: 'S' },
];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function WeekdayPicker({ value, onChange }: { value: Weekday[]; onChange: (v: Weekday[]) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.weekdays}>
      {WEEKDAYS.map((d) => {
        const on = value.includes(d.value);
        return (
          <Pressable
            key={d.value}
            accessibilityRole="checkbox"
            accessibilityLabel={WEEKDAY_NAMES[d.value]}
            accessibilityState={{ checked: on }}
            onPress={() => {
              haptic();
              onChange(on ? value.filter((v) => v !== d.value) : [...value, d.value]);
            }}
            style={[styles.weekday, { backgroundColor: on ? theme.primary : theme.surfaceAlt }]}>
            <T variant="bodyStrong" style={{ color: on ? theme.onPrimary : theme.text }}>{d.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────

export interface DayDots {
  reactive?: boolean;
  success?: boolean;
  walks?: number;
}

function DayCell({
  day,
  selected,
  isToday,
  inMonth = true,
  dots,
  onPress,
  showWeekday,
}: {
  day: DateKey;
  selected: boolean;
  isToday: boolean;
  inMonth?: boolean;
  dots?: DayDots;
  onPress: () => void;
  showWeekday?: boolean;
}) {
  const theme = useTheme();
  const d = fromDateKey(day);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={format(d, 'EEEE, MMMM d')}
      accessibilityState={{ selected }}
      onPress={() => {
        haptic();
        onPress();
      }}
      style={[styles.dayCell, selected && { backgroundColor: theme.primary }, !inMonth && { opacity: 0.35 }]}>
      {showWeekday && (
        <T variant="caption" style={{ color: selected ? theme.onPrimary : theme.textMuted, fontSize: 11 }}>
          {format(d, 'EEEEE')}
        </T>
      )}
      <T
        variant="bodyStrong"
        style={{
          color: selected ? theme.onPrimary : isToday ? theme.primary : theme.text,
          fontWeight: isToday || selected ? '800' : '500',
        }}>
        {d.getDate()}
      </T>
      <View style={styles.dots}>
        {dots?.reactive && <View style={[styles.dot, { backgroundColor: theme.reactive }]} />}
        {dots?.success && <View style={[styles.dot, { backgroundColor: theme.success }]} />}
        {!dots?.reactive && !dots?.success && !!dots?.walks && (
          <View style={[styles.dot, { backgroundColor: selected ? theme.onPrimary : theme.textMuted, opacity: 0.5 }]} />
        )}
      </View>
    </Pressable>
  );
}

export function WeekStrip({
  selected,
  today,
  onSelect,
  dotsFor,
}: {
  selected: DateKey;
  today: DateKey;
  onSelect: (d: DateKey) => void;
  dotsFor: (d: DateKey) => DayDots | undefined;
}) {
  return (
    <View style={styles.week}>
      {weekOf(selected).map((day) => (
        <DayCell key={day} day={day} selected={day === selected} isToday={day === today} dots={dotsFor(day)} onPress={() => onSelect(day)} showWeekday />
      ))}
    </View>
  );
}

export function MonthGrid({
  selected,
  today,
  onSelect,
  dotsFor,
}: {
  selected: DateKey;
  today: DateKey;
  onSelect: (d: DateKey) => void;
  dotsFor?: (d: DateKey) => DayDots | undefined;
}) {
  const [cursor, setCursor] = useState(selected.slice(0, 7) + '-01');
  const month = periodContaining('month', cursor);
  const weeks: DateKey[][] = [];
  let weekStart = weekOf(month.start)[0];
  while (weekStart <= month.end) {
    const days = weekOf(weekStart);
    weeks.push(days);
    weekStart = toDateKey(new Date(fromDateKey(days[6]).getTime() + 86400000));
  }
  const shift = (n: number) => setCursor(toDateKey(addMonths(fromDateKey(cursor), n)));
  return (
    <View style={{ gap: Space.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton icon="‹" label="Previous month" onPress={() => shift(-1)} size={36} />
        <T variant="heading">{format(fromDateKey(cursor), 'MMMM yyyy')}</T>
        <IconButton icon="›" label="Next month" onPress={() => shift(1)} size={36} />
      </Row>
      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => (
          <T key={i} variant="caption" tone="muted" style={styles.weekHeader}>{d.label}</T>
        ))}
      </View>
      {weeks.map((w) => (
        <View key={w[0]} style={styles.week}>
          {w.map((day) => (
            <DayCell
              key={day}
              day={day}
              selected={day === selected}
              isToday={day === today}
              inMonth={day >= month.start && day <= month.end}
              dots={dotsFor?.(day)}
              onPress={() => onSelect(day)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Triggers ──────────────────────────────────────────────────────────────

export function TriggerChips({
  triggers,
  selected,
  onSelect,
}: {
  triggers: Trigger[];
  selected?: string;
  onSelect: (id: string) => void;
}) {
  const theme = useTheme();
  return (
    <ChipRow>
      {triggers.map((t) => (
        <Chip
          key={t.id}
          label={t.name}
          leading={<T>{t.emoji}</T>}
          tint={triggerTint(theme, t.colorIndex)}
          selected={t.id === selected}
          onPress={() => onSelect(t.id)}
        />
      ))}
    </ChipRow>
  );
}

export const TRIGGER_SUGGESTIONS: { name: string; emoji: string }[] = [
  { name: 'Other dogs', emoji: '🐕' },
  { name: 'Strangers', emoji: '🧍' },
  { name: 'Bikes', emoji: '🚲' },
  { name: 'Cars', emoji: '🚗' },
  { name: 'Joggers', emoji: '🏃' },
  { name: 'Kids', emoji: '🧒' },
  { name: 'Cats', emoji: '🐈' },
  { name: 'Skateboards', emoji: '🛹' },
  { name: 'Loud noises', emoji: '🔊' },
  { name: 'Squirrels', emoji: '🐿️' },
  { name: 'Trucks', emoji: '🚚' },
  { name: 'Scooters', emoji: '🛴' },
  { name: 'Umbrellas', emoji: '☂️' },
  { name: 'People in hats', emoji: '🧢' },
];

export const TRIGGER_EMOJIS = ['🐕', '🧍', '🚲', '🚗', '🏃', '🧒', '🐈', '🛹', '🔊', '🐿️', '🚚', '🛴', '☂️', '🧢', '🦆', '🐎', '👮', '🧑‍🦯', '🛵', '🚌', '🎈', '⚡'];

export function todayKeyNow(): DateKey {
  return toDateKey(new Date());
}

const styles = StyleSheet.create({
  intensityRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  intensityDot: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  anchor: { borderRadius: Radius.md, padding: Space.md },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    padding: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  stepperValue: { minWidth: 36, textAlign: 'center', fontVariant: ['tabular-nums'] },
  weekdays: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  weekday: { flex: 1, maxWidth: 46, aspectRatio: 1, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekHeader: { flex: 1, textAlign: 'center' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: Radius.md, gap: 2, minHeight: 48 },
  dots: { flexDirection: 'row', gap: 3, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
