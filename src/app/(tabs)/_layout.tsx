import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { type ColorValue, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName, focusedName: IconName) {
  return function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? focusedName : name} color={color as string} size={size} />;
  };
}

export default function TabLayout() {
  const theme = useTheme();
  // On web the bar gets a taller custom height, so add the home-indicator inset ourselves.
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          ...(Platform.OS === 'web' ? { height: 64 + bottom, paddingBottom: 8 + bottom, paddingTop: 6 } : null),
        },
        tabBarLabelStyle: { fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Walks', tabBarIcon: icon('calendar-outline', 'calendar') }} />
      <Tabs.Screen name="trends" options={{ title: 'Progress', tabBarIcon: icon('trending-up-outline', 'trending-up') }} />
      <Tabs.Screen name="triggers" options={{ title: 'Triggers', tabBarIcon: icon('flash-outline', 'flash') }} />
      <Tabs.Screen name="dog" options={{ title: 'My dog', tabBarIcon: icon('paw-outline', 'paw') }} />
    </Tabs>
  );
}
