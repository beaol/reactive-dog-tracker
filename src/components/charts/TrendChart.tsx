import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { T } from '@/components/ui/Typography';
import { type BucketStats, metricValue, type ReactiveMetric, REACTIVE_METRICS } from '@/domain/stats';
import { Radius, Space, type Theme, useTheme } from '@/theme/theme';

/**
 * Trend chart for reactions and successes.
 *
 * Rules applied (see dataviz skill): one y-axis only — successes share the
 * axis with reactions only when both are counts ("walks with a reaction" vs
 * "success moments"). For intensity metrics successes move to a synced panel
 * underneath, sharing the x-axis and the selection. Bars ≤ 24px with 4px
 * rounded data-ends, 2px lines, ≥ 8px markers with a surface ring, hairline
 * grid, legend whenever two series share a plot, tooltip on tap/hover.
 */

export type SeriesMode = 'reactive' | 'both' | 'success';

interface Props {
  data: BucketStats[];
  metric: ReactiveMetric;
  mode: SeriesMode;
  height?: number;
  /** Index of the last bucket that has started (later buckets are the future). */
  lastIndex?: number;
}

const PAD = { left: 30, right: 8, top: 10, bottom: 22 };

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const max = Math.ceil(value / (step * pow)) * step * pow;
    if (max / (step * pow) <= 5) return max;
  }
  return value;
}

function ticks(max: number): number[] {
  const steps = 4;
  return Array.from({ length: steps + 1 }, (_, i) => (max / steps) * i);
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function showXLabel(i: number, n: number): boolean {
  if (n <= 12) return true;
  const day = i + 1;
  return day === 1 || day % 5 === 0;
}

/** Bar with 4px rounded top, square at the baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x} ${y + h} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} L${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r} L${x + w} ${y + h} Z`;
}

interface PlotProps {
  width: number;
  height: number;
  data: BucketStats[];
  bars?: (number | null)[];
  line?: number[];
  yMax: number;
  selected: number | null;
  onSelect: (i: number | null) => void;
  theme: Theme;
  showXAxis?: boolean;
  /** Last bucket that is not in the future; lines stop here. */
  lastIndex: number;
}

function Plot({ width, height, data, bars, line: fullLine, yMax, selected, onSelect, theme, showXAxis = true, lastIndex }: PlotProps) {
  const line = fullLine?.slice(0, lastIndex + 1);
  const n = data.length;
  const plotW = width - PAD.left - PAD.right;
  const bottom = showXAxis ? PAD.bottom : 6;
  const plotH = height - PAD.top - bottom;
  const slot = plotW / n;
  const barW = Math.max(3, Math.min(24, slot * 0.62));
  const x = (i: number) => PAD.left + slot * i + slot / 2;
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;

  const linePath = line
    ? line.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(v)}`).join(' ')
    : '';
  const areaPath = line
    ? `${linePath} L${x(line.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`
    : '';
  const dotR = n > 12 ? 3 : 4;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {ticks(yMax).map((tv) => (
          <G_Tick key={tv} y={y(tv)} label={fmt(tv)} width={width} theme={theme} baseline={tv === 0} />
        ))}
        {selected !== null && (
          <Path
            d={`M${PAD.left + slot * selected} ${PAD.top} h${slot} V${PAD.top + plotH} h${-slot} Z`}
            fill={theme.text}
            opacity={0.05}
          />
        )}
        {bars?.map((v, i) =>
          v ? (
            <Path
              key={i}
              d={barPath(x(i) - barW / 2, y(v), barW, y(0) - y(v))}
              fill={theme.reactive}
              opacity={selected === null || selected === i ? 1 : 0.45}
            />
          ) : null,
        )}
        {line && line.length > 0 && (
          <>
            {!bars && <Path d={areaPath} fill={theme.success} opacity={0.1} />}
            <Path d={linePath} stroke={theme.success} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {line.map((v, i) =>
              v > 0 || selected === i ? (
                <Circle key={i} cx={x(i)} cy={y(v)} r={dotR} fill={theme.success} stroke={theme.chartSurface} strokeWidth={2} />
              ) : null,
            )}
          </>
        )}
        {showXAxis &&
          data.map((d, i) =>
            showXLabel(i, n) ? (
              <SvgText
                key={d.bucket.key}
                x={x(i)}
                y={height - 6}
                fontSize={10}
                fill={selected === i ? theme.text : theme.axisLabel}
                fontWeight={selected === i ? '700' : '400'}
                textAnchor="middle">
                {d.bucket.label}
              </SvgText>
            ) : null,
          )}
      </Svg>
      {/* Hit targets: full-height columns, wider than the marks. */}
      <View style={[StyleSheet.absoluteFill, styles.hitRow, { left: PAD.left, right: PAD.right }]}>
        {data.map((d, i) => (
          <Pressable
            key={d.bucket.key}
            accessibilityRole="button"
            accessibilityLabel={d.bucket.longLabel}
            style={styles.hit}
            onPress={() => onSelect(selected === i ? null : i)}
            onHoverIn={() => onSelect(i)}
          />
        ))}
      </View>
    </View>
  );
}

function G_Tick({ y, label, width, theme, baseline }: { y: number; label: string; width: number; theme: Theme; baseline: boolean }) {
  return (
    <>
      <Line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} stroke={baseline ? theme.axis : theme.grid} strokeWidth={1} />
      <SvgText x={PAD.left - 6} y={y + 3.5} fontSize={10} fill={theme.axisLabel} textAnchor="end">
        {label}
      </SvgText>
    </>
  );
}

function LegendItem({ color, label, kind }: { color: string; label: string; kind: 'bar' | 'line' }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={
          kind === 'bar'
            ? { width: 10, height: 10, borderRadius: 3, backgroundColor: color }
            : { width: 16, height: 3, borderRadius: 2, backgroundColor: color }
        }
      />
      <T variant="caption" tone="secondary">
        {label}
      </T>
    </View>
  );
}

export function TrendChart({ data, metric, mode, height = 200, lastIndex = data.length - 1 }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const reactive = data.map((d) => metricValue(d, metric));
  const success = data.map((d) => d.successCount);
  const metricInfo = REACTIVE_METRICS.find((m) => m.value === metric)!;

  const sharedAxis = mode === 'both' && metric === 'walks';
  const separatePanel = mode === 'both' && metric !== 'walks';

  const reactiveMax = metric === 'mean' ? 10 : niceMax(Math.max(0, ...reactive.map((v) => v ?? 0)));
  const successMax = niceMax(Math.max(0, ...success));
  const sharedMax = niceMax(Math.max(0, ...reactive.map((v) => v ?? 0), ...success));

  const sel = selected !== null ? data[selected] : null;
  const selReactive = selected !== null ? reactive[selected] : null;

  return (
    <View onLayout={onLayout} style={{ gap: Space.sm }}>
      {mode === 'both' && sharedAxis && (
        <View style={styles.legend}>
          <LegendItem color={theme.reactive} label="Walks with a reaction" kind="bar" />
          <LegendItem color={theme.success} label="Success moments" kind="line" />
        </View>
      )}

      {/* Tooltip lives above the plot so a finger never covers it. */}
      <View style={[styles.tooltip, { backgroundColor: sel ? theme.surfaceAlt : 'transparent' }]}>
        <T variant="caption" tone={sel ? 'default' : 'muted'} style={sel ? { fontWeight: '700' } : undefined}>
          {sel?.bucket.longLabel ?? 'Tap a column to see its numbers'}
        </T>
        <View style={[styles.tooltipValues, !sel && { opacity: 0 }]}>
          {mode !== 'success' && (
            <T variant="caption" tone="secondary">
              <T variant="caption" style={{ color: theme.reactive }}>■ </T>
              {metricInfo.label}: {selReactive === null || selReactive === undefined ? '—' : fmt(selReactive)}
            </T>
          )}
          {mode !== 'reactive' && (
            <T variant="caption" tone="secondary">
              <T variant="caption" style={{ color: theme.success }}>● </T>
              Successes: {sel?.successCount ?? 0}
            </T>
          )}
        </View>
      </View>

      {width > 0 && (
        <>
          {mode !== 'success' && (
            <Plot
              width={width}
              height={height}
              data={data}
              bars={reactive}
              line={sharedAxis ? success : undefined}
              yMax={sharedAxis ? sharedMax : reactiveMax}
              selected={selected}
              onSelect={setSelected}
              theme={theme}
              lastIndex={lastIndex}
              showXAxis={!separatePanel}
            />
          )}
          {separatePanel && (
            <>
              <T variant="caption" tone="secondary" style={{ marginTop: Space.xs }}>
                Success moments
              </T>
              <Plot width={width} height={110} data={data} line={success} yMax={successMax} selected={selected} onSelect={setSelected} theme={theme} lastIndex={lastIndex} />
            </>
          )}
          {mode === 'success' && (
            <Plot width={width} height={height} data={data} line={success} yMax={successMax} selected={selected} onSelect={setSelected} theme={theme} lastIndex={lastIndex} />
          )}
        </>
      )}
    </View>
  );
}

/** Accessible table view of the same numbers. */
export function TrendTable({ data, metric }: { data: BucketStats[]; metric: ReactiveMetric }) {
  const theme = useTheme();
  const label = REACTIVE_METRICS.find((m) => m.value === metric)!.label;
  const rows = data.filter((d) => d.reactiveCount + d.successCount > 0);
  if (!rows.length) return <T tone="muted">No entries in this period.</T>;
  return (
    <View>
      <View style={[styles.tableRow, { borderColor: theme.border }]}>
        <T variant="caption" tone="muted" style={styles.tableFirst}>Period</T>
        <T variant="caption" tone="muted" style={styles.tableCell}>{label}</T>
        <T variant="caption" tone="muted" style={styles.tableCell}>Successes</T>
      </View>
      {rows.map((d) => {
        const v = metricValue(d, metric);
        return (
          <View key={d.bucket.key} style={[styles.tableRow, { borderColor: theme.border }]}>
            <T variant="caption" style={styles.tableFirst}>{d.bucket.longLabel}</T>
            <T variant="caption" style={[styles.tableCell, styles.num]}>{v === null ? '—' : fmt(v)}</T>
            <T variant="caption" style={[styles.tableCell, styles.num]}>{d.successCount}</T>
          </View>
        );
      })}
    </View>
  );
}

/** Tiny single-series sparkline for list rows (no axes; the row text names it). */
export function Sparkline({ values, color, width = 84, height = 28 }: { values: number[]; color: string; width?: number; height?: number }) {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? (width - 6) / (values.length - 1) : 0;
  const pts = values.map((v, i) => [3 + i * step, height - 3 - (v / max) * (height - 6)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {last && <Circle cx={last[0]} cy={last[1]} r={3} fill={color} />}
    </Svg>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: Space.lg, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tooltip: { borderRadius: Radius.sm, paddingHorizontal: Space.md, paddingVertical: Space.sm, gap: 2 },
  tooltipValues: { flexDirection: 'row', gap: Space.lg, flexWrap: 'wrap' },
  hitRow: { flexDirection: 'row' },
  hit: { flex: 1 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  tableFirst: { flex: 1.6 },
  tableCell: { flex: 1, textAlign: 'right' },
  num: { fontVariant: ['tabular-nums'] },
});
