import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { Radius, Space, useTheme } from '@/theme/theme';

import { haptic } from './Button';
import { T } from './Typography';

export function Chip({
  label,
  selected,
  onPress,
  leading,
  tint,
  onLongPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  leading?: ReactNode;
  tint?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => {
        haptic();
        onPress?.();
      }}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.primarySoft : (tint ?? theme.surfaceAlt),
          borderColor: selected ? theme.primary : 'transparent',
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      {leading}
      <T variant="caption" style={{ fontWeight: selected ? '700' : '500', color: theme.text }}>
        {label}
      </T>
    </Pressable>
  );
}

export function ChipRow({ children, scroll }: { children: ReactNode; scroll?: boolean }) {
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.chipRow, styles.wrap]}>{children}</View>;
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.segmented, { backgroundColor: theme.surfaceAlt }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              haptic();
              onChange(o.value);
            }}
            style={[
              styles.segment,
              selected && { backgroundColor: theme.surface, shadowColor: theme.shadow, ...styles.segmentSelected },
            ]}>
            <T variant="caption" style={{ fontWeight: selected ? '700' : '500', color: selected ? theme.text : theme.textSecondary }} numberOfLines={1}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TextField({ label, style, ...props }: TextInputProps & { label?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: Space.xs }}>
      {label ? (
        <T variant="label" tone="muted">
          {label}
        </T>
      ) : null}
      <TextInput
        placeholderTextColor={theme.textMuted}
        style={[
          styles.input,
          { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
          props.multiline && styles.multiline,
          style,
        ]}
        {...props}
      />
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  size = 40,
}: {
  icon: string;
  onPress: () => void;
  label: string;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        haptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, backgroundColor: pressed ? theme.surfacePressed : theme.surfaceAlt },
      ]}>
      <T style={{ fontSize: size * 0.45, lineHeight: size * 0.6, color: theme.text }}>{icon}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  chipRow: { flexDirection: 'row', gap: Space.sm, paddingVertical: 2 },
  wrap: { flexWrap: 'wrap' },
  segmented: { flexDirection: 'row', borderRadius: Radius.pill, padding: 3 },
  segment: {
    flex: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Space.sm,
  },
  segmentSelected: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    minHeight: 48,
    fontSize: 16,
  },
  multiline: { minHeight: 88, paddingTop: Space.md, textAlignVertical: 'top' },
  iconButton: { borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
