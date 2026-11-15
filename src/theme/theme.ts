import { Platform, useColorScheme } from 'react-native';

/**
 * Design tokens. A warm, calm palette: cream paper, soft ink, a gentle violet
 * for actions. Data colours follow the validated categorical reference palette
 * (slot 2 orange for reactions, slot 3 aqua for successes — an adjacent,
 * CVD-checked pair), stepped separately for dark mode.
 */
const light = {
  scheme: 'light' as 'light' | 'dark',
  background: '#FBF6EF',
  surface: '#FFFFFF',
  surfaceAlt: '#F4ECE1',
  surfacePressed: '#EDE3D6',
  text: '#2B2420',
  textSecondary: '#6B5F55',
  textMuted: '#968B81',
  border: 'rgba(43,36,32,0.10)',
  primary: '#5A4FCF',
  primarySoft: '#ECEAFB',
  onPrimary: '#FFFFFF',
  danger: '#C2413B',
  dangerSoft: '#FBE7E5',

  reactive: '#eb6834',
  reactiveSoft: '#FDEBE2',
  success: '#1baf7a',
  successSoft: '#DFF5EC',
  /** Text-safe success ink (deltas, labels). */
  successInk: '#006300',

  chartSurface: '#FFFFFF',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  axisLabel: '#898781',
  shadow: 'rgba(80,60,40,0.10)',
};

export type Theme = typeof light;

const dark: Theme = {
  scheme: 'dark',
  background: '#141210',
  surface: '#1E1B18',
  surfaceAlt: '#2A2622',
  surfacePressed: '#34302B',
  text: '#F3EEE8',
  textSecondary: '#C9BFB4',
  textMuted: '#8F857B',
  border: 'rgba(255,255,255,0.10)',
  primary: '#9A90F2',
  primarySoft: '#2C2850',
  onPrimary: '#141210',
  danger: '#E66767',
  dangerSoft: '#3A1E1D',

  reactive: '#d95926',
  reactiveSoft: '#3A2419',
  success: '#199e70',
  successSoft: '#163128',
  successInk: '#0ca30c',

  chartSurface: '#1E1B18',
  grid: '#2c2c2a',
  axis: '#383835',
  axisLabel: '#898781',
  shadow: 'rgba(0,0,0,0.4)',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Soft identity tints for trigger chips (decorative, never data encoding). */
export const TRIGGER_TINTS = {
  light: ['#DCE9FB', '#FBE3D6', '#D9F2E8', '#FCEFC8', '#F9DDE8', '#DDEFD8', '#E3DFFA', '#F8DADA'],
  dark: ['#1F3550', '#4A2A1C', '#173A2E', '#45391A', '#47253A', '#1F3B1F', '#2C2852', '#4A2222'],
};

export function triggerTint(theme: Theme, colorIndex: number): string {
  const list = TRIGGER_TINTS[theme.scheme];
  return list[colorIndex % list.length];
}

/** Intensity 1→10 rendered as a warm ramp (used for the picker only). */
export function intensityColor(theme: Theme, value: number): string {
  const ramp =
    theme.scheme === 'dark'
      ? ['#5A4A2E', '#6B5131', '#7C5533', '#8E5835', '#A05A33', '#B25A30', '#C3572C', '#D35228', '#E14C27', '#EC4526']
      : ['#F9DFB8', '#F7CF9C', '#F5BE82', '#F2AB6B', '#EF9757', '#EB8246', '#E66E3A', '#DE5A31', '#D2482C', '#C2392A'];
  return ramp[Math.max(0, Math.min(9, value - 1))];
}

export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const Radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const MaxContentWidth = 720;

export const Fonts = {
  rounded: Platform.select({
    ios: 'ui-rounded',
    web: "'SF Pro Rounded', ui-rounded, 'Nunito', system-ui, sans-serif",
    default: undefined,
  }),
};
