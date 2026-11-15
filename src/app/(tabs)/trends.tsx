import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type SeriesMode, Sparkline, TrendChart, TrendTable } from '@/components/charts/TrendChart';
import { Button } from '@/components/ui/Button';
import { Chip, ChipRow, IconButton, Segmented } from '@/components/ui/Controls';
import { Card, Row, Screen, SectionHeader } from '@/components/ui/Layout';
import { T } from '@/components/ui/Typography';
import { type PeriodKind, periodContaining, periodLabel, shiftPeriod, todayKey } from '@/domain/dates';
import { insightsFor } from '@/domain/encouragement';
import { compareWithPrevious, computeTrend, type PeriodSummary, REACTIVE_METRICS, type ReactiveMetric, triggerBreakdown } from '@/domain/stats';
import { useActiveDog, useDogData } from '@/store/appStore';
import { Radius, Space, triggerTint, useTheme } from '@/theme/theme';

export default function TrendsScreen() {
  const theme = useTheme();
  const dog = useActiveDog();
  const data = useDogData();

  const [kind, setKind] = useState<PeriodKind>('week');
  const [anchor, setAnchor] = useState(todayKey());
  const [triggerId, setTriggerId] = useState<string | 'all'>('all');
  const [metric, setMetric] = useState<ReactiveMetric>('walks');
  const [mode, setMode] = useState<SeriesMode>('both');
  const [asTable, setAsTable] = useState(false);

  const period = periodContaining(kind, anchor);
  const isCurrent = period.start <= todayKey() && todayKey() <= period.end;
  const triggerIds = triggerId === 'all' ? undefined : new Set([triggerId]);

  const input = { period, walks: data.walks, markers: data.markers, triggerIds };
  // Cheap pure computations; the React Compiler memoises them per render inputs.
  const trend = computeTrend(input);
  const cmp = compareWithPrevious(input, todayKey());
  const breakdown = triggerBreakdown(period, data.walks, data.markers, data.triggers);

  const today = todayKey();
  const lastIndex = Math.max(0, trend.findLastIndex((b) => b.bucket.start <= today));
  const visibleTriggers = data.triggers.filter((t) => !t.archived || data.markers.some((m) => m.triggerId === t.id));
  const insights = dog ? insightsFor(cmp, kind, { dogName: dog.name, seed: `${period.start}|${triggerId}` }) : [];
  const metricInfo = REACTIVE_METRICS.find((m) => m.value === metric)!;
  const chartTitle =
    mode === 'success' ? 'Success moments' : mode === 'reactive' ? metricInfo.label : `${metricInfo.label} & successes`;

  return (
    <Screen>
      <T variant="title">Progress</T>

      <Segmented
        accessibilityLabel="Time range"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
          { value: 'year', label: 'Year' },
        ]}
      />
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton icon="‹" label="Previous period" onPress={() => setAnchor(shiftPeriod(period, -1).start)} />
        <View style={{ alignItems: 'center' }}>
          <T variant="heading">{periodLabel(period)}</T>
          {!isCurrent && <Button small kind="ghost" label="Back to now" onPress={() => setAnchor(todayKey())} />}
        </View>
        <IconButton icon="›" label="Next period" onPress={() => setAnchor(shiftPeriod(period, 1).start)} />
      </Row>

      <ChipRow scroll>
        <Chip label="All triggers" selected={triggerId === 'all'} onPress={() => setTriggerId('all')} />
        {visibleTriggers.map((t) => (
          <Chip key={t.id} label={t.name} leading={<T>{t.emoji}</T>} tint={triggerTint(theme, t.colorIndex)} selected={triggerId === t.id} onPress={() => setTriggerId(t.id)} />
        ))}
      </ChipRow>

      <StatTiles cmp={cmp} periodNoun={kind} />

      {insights.length > 0 && (
        <Card tint={theme.primarySoft}>
          <View style={{ gap: Space.sm }}>
            {insights.map((i, idx) => (
              <T key={idx} style={{ color: theme.text }}>
                {i.tone === 'celebrate' ? '🌟 ' : i.tone === 'support' ? '🤍 ' : '🐾 '}
                {i.text}
              </T>
            ))}
          </View>
        </Card>
      )}

      <Card>
        <View style={{ gap: Space.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <T variant="heading">{chartTitle}</T>
              <T variant="caption" tone="muted">
                {kind === 'year' ? 'Per month' : 'Per day'}
                {mode !== 'success' ? ` · ${metricInfo.unit}` : ''}
              </T>
            </View>
            <Button small kind="ghost" label={asTable ? 'Chart' : 'Table'} onPress={() => setAsTable(!asTable)} />
          </Row>
          <Segmented
            accessibilityLabel="Series"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'reactive', label: 'Reactions' },
              { value: 'both', label: 'Both' },
              { value: 'success', label: 'Successes' },
            ]}
          />
          {mode !== 'success' && (
            <Segmented
              accessibilityLabel="Reaction measure"
              value={metric}
              onChange={setMetric}
              options={REACTIVE_METRICS.map((m) => ({ value: m.value, label: m.label }))}
            />
          )}
          {asTable ? <TrendTable data={trend} metric={metric} /> : <TrendChart data={trend} metric={metric} mode={mode} lastIndex={lastIndex} />}
        </View>
      </Card>

      <SectionHeader title="By trigger" />
      {breakdown.length === 0 && <T tone="muted">Add triggers to see a breakdown.</T>}
      {breakdown.map(({ trigger, summary, trend: t }) => (
        <Card key={trigger.id} onPress={() => setTriggerId(trigger.id)} accessibilityLabel={`Show ${trigger.name}`}>
          <Row gap={Space.md}>
            <View style={[styles.emoji, { backgroundColor: triggerTint(theme, trigger.colorIndex) }]}>
              <T style={{ fontSize: 20 }}>{trigger.emoji}</T>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="bodyStrong">{trigger.name}{trigger.archived ? ' (archived)' : ''}</T>
              <T variant="caption" tone="secondary">
                {summary.reactiveCount} reaction{summary.reactiveCount === 1 ? '' : 's'}
                {summary.meanIntensity !== null ? ` · avg ${summary.meanIntensity.toFixed(1)}` : ''}
                {` · ${summary.successCount} success${summary.successCount === 1 ? '' : 'es'}`}
              </T>
            </View>
            <View style={{ gap: 2, alignItems: 'flex-end' }}>
              <Sparkline values={t.slice(0, lastIndex + 1).map((b) => b.reactiveCount)} color={theme.reactive} height={20} />
              <Sparkline values={t.slice(0, lastIndex + 1).map((b) => b.successCount)} color={theme.success} height={20} />
            </View>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

function StatTiles({ cmp, periodNoun }: { cmp: ReturnType<typeof compareWithPrevious>; periodNoun: PeriodKind }) {
  const { current: c, previous: p } = cmp;
  return (
    <View style={styles.tiles}>
      <Tile label="Reactions" value={String(c.reactiveCount)} delta={delta(c, p, 'reactiveCount', 'lower')} periodNoun={periodNoun} />
      <Tile label="Avg intensity" value={c.meanIntensity === null ? '—' : c.meanIntensity.toFixed(1)} delta={delta(c, p, 'meanIntensity', 'lower')} periodNoun={periodNoun} />
      <Tile label="Successes" value={String(c.successCount)} delta={delta(c, p, 'successCount', 'higher')} periodNoun={periodNoun} />
      <Tile label="Calm choices" value={c.successShare === null ? '—' : `${Math.round(c.successShare * 100)}%`} delta={delta(c, p, 'successShare', 'higher', true)} periodNoun={periodNoun} />
    </View>
  );
}

interface Delta {
  text: string;
  good: boolean;
}

function delta(c: PeriodSummary, p: PeriodSummary, key: keyof PeriodSummary, better: 'lower' | 'higher', pct = false): Delta | null {
  // No history to compare against → no delta (a jump from zero means nothing).
  if (p.reactiveCount + p.successCount === 0) return null;
  const a = c[key];
  const b = p[key];
  if (a === null || b === null || a === b) return null;
  const diff = (a as number) - (b as number);
  const good = better === 'lower' ? diff < 0 : diff > 0;
  const mag = pct ? `${Math.round(Math.abs(diff) * 100)} pts` : Number.isInteger(diff) ? String(Math.abs(diff)) : Math.abs(diff).toFixed(1);
  return { text: `${diff > 0 ? '▲' : '▼'} ${mag}`, good };
}

function Tile({ label, value, delta: d, periodNoun }: { label: string; value: string; delta: Delta | null; periodNoun: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <T variant="caption" tone="muted">{label}</T>
      <T variant="title">{value}</T>
      <T variant="caption" style={{ color: d?.good ? theme.successInk : theme.textMuted }} numberOfLines={1}>
        {d ? `${d.text} vs last ${periodNoun}` : ' '}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Space.md,
    gap: 2,
  },
  emoji: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
