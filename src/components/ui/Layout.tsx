import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Space, useTheme } from '@/theme/theme';

import { T } from './Typography';

/** Scrollable page with safe-area padding and a centred max width (tablet/web). */
export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
}) {
  const theme = useTheme();
  const inner = <View style={[styles.content, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: theme.background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  onPress,
  tint,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  tint?: string;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const base = [
    styles.card,
    { backgroundColor: tint ?? theme.surface, borderColor: theme.border, shadowColor: theme.shadow },
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [base, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <T variant="label" tone="muted">
        {title}
      </T>
      {action}
    </View>
  );
}

export function Row({ children, gap = Space.sm, style }: { children: ReactNode; gap?: number; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function EmptyState({ emoji, title, body, action }: { emoji: string; title: string; body: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <T style={styles.emptyEmoji}>{emoji}</T>
      <T variant="heading" center>
        {title}
      </T>
      <T tone="secondary" center>
        {body}
      </T>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingBottom: Space.xxl * 2 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Space.lg,
    paddingTop: Space.md,
    gap: Space.lg,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Space.sm,
  },
  empty: { alignItems: 'center', gap: Space.sm, paddingVertical: Space.xl, paddingHorizontal: Space.lg },
  emptyEmoji: { fontSize: 40, lineHeight: 48 },
});
