import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';

import { setUpWebApp } from '@/platform/webApp';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
setUpWebApp();

export default function RootLayout() {
  const theme = useTheme();
  const hydrated = useAppStore((s) => s.hydrated);
  const hasDogs = useAppStore((s) => s.dogs.length > 0);

  useEffect(() => {
    useAppStore
      .getState()
      .hydrate()
      .finally(() => SplashScreen.hideAsync().catch(() => {}));
  }, []);

  const navTheme = useMemo(() => {
    const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.primary,
        background: theme.background,
        card: theme.background,
        text: theme.text,
        border: theme.border,
      },
    };
  }, [theme]);

  if (!hydrated) return null;

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.primary,
          headerTitleStyle: { color: theme.text, fontWeight: '700' },
          contentStyle: { backgroundColor: theme.background },
          headerBackButtonDisplayMode: 'minimal',
        }}>
        <Stack.Protected guard={hasDogs}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="walk/[key]" options={{ title: 'Walk' }} />
          <Stack.Screen name="walk/new" options={{ presentation: 'modal', title: 'Add a walk' }} />
          <Stack.Screen name="marker" options={{ presentation: 'modal', title: 'Log a moment' }} />
          <Stack.Screen name="schedules/index" options={{ title: 'Walk schedules' }} />
          <Stack.Screen name="schedules/edit" options={{ presentation: 'modal', title: 'Schedule' }} />
          <Stack.Screen name="dog-form" options={{ presentation: 'modal', title: 'Dog profile' }} />
        </Stack.Protected>
        <Stack.Protected guard={!hasDogs}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
        {/* Developer-only breed gallery. Guarded so it can never become the
            fallback route (e.g. instead of onboarding when no dog exists). */}
        <Stack.Protected guard={__DEV__ && hasDogs}>
          <Stack.Screen name="gallery" options={{ title: 'Breed gallery' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
