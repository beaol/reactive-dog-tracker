import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Radius, Space, useTheme } from '@/theme/theme';

import { T } from './Typography';

type Kind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'reactive' | 'success';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  kind?: Kind;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

export function haptic(style: 'light' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (style === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function Button({ label, onPress, kind = 'primary', icon, disabled, loading, small, style, accessibilityHint }: ButtonProps) {
  const theme = useTheme();
  const palette: Record<Kind, { bg: string; fg: string; pressed: string }> = {
    primary: { bg: theme.primary, fg: theme.onPrimary, pressed: theme.primary },
    secondary: { bg: theme.surfaceAlt, fg: theme.text, pressed: theme.surfacePressed },
    ghost: { bg: 'transparent', fg: theme.primary, pressed: theme.primarySoft },
    danger: { bg: theme.dangerSoft, fg: theme.danger, pressed: theme.dangerSoft },
    reactive: { bg: theme.reactiveSoft, fg: theme.text, pressed: theme.reactiveSoft },
    success: { bg: theme.successSoft, fg: theme.text, pressed: theme.successSoft },
  };
  const p = palette[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={() => {
        haptic();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        { backgroundColor: pressed ? p.pressed : p.bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <T variant={small ? 'caption' : 'bodyStrong'} style={{ color: p.fg, fontWeight: '700' }}>
            {label}
          </T>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: Space.xl,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { minHeight: 36, paddingHorizontal: Space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
});
