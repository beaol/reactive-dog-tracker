import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, useTheme } from '@/theme/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label';
type Tone = 'default' | 'secondary' | 'muted' | 'primary' | 'danger' | 'success' | 'onPrimary';

export interface TProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  center?: boolean;
}

export function T({ variant = 'body', tone = 'default', center, style, ...rest }: TProps) {
  const theme = useTheme();
  const color = {
    default: theme.text,
    secondary: theme.textSecondary,
    muted: theme.textMuted,
    primary: theme.primary,
    danger: theme.danger,
    success: theme.successInk,
    onPrimary: theme.onPrimary,
  }[tone];
  return (
    <Text
      style={[styles[variant], { color }, center && styles.center, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800', fontFamily: Fonts.rounded, letterSpacing: -0.4 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', fontFamily: Fonts.rounded },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  center: { textAlign: 'center' },
});
