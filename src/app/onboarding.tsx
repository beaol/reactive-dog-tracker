import { router } from 'expo-router';
import { Platform, View } from 'react-native';

import { DogForm } from '@/components/DogForm';
import { Card, Screen } from '@/components/ui/Layout';
import { T } from '@/components/ui/Typography';
import { isInstalledWebApp } from '@/platform/webApp';
import { useAppStore } from '@/store/appStore';
import { Space } from '@/theme/theme';

export default function Onboarding() {
  const addDog = useAppStore((s) => s.addDog);
  return (
    <Screen>
      <View style={{ gap: Space.sm, paddingTop: Space.xl }}>
        <T variant="display">Welcome 💛</T>
        <T tone="secondary">
          This is a calm place to track your walks, notice patterns and celebrate progress. Reactivity
          is a feeling, not a flaw — and it is never your dog&apos;s fault.
        </T>
        <T variant="caption" tone="muted">
          Everything you log stays on this device. No account, no cloud.
        </T>
      </View>
      {Platform.OS === 'web' && !isInstalledWebApp() && (
        <Card>
          <View style={{ gap: Space.xs }}>
            <T variant="bodyStrong">📲 Install the app first</T>
            <T tone="secondary">
              On iPhone: tap Share, then “Add to Home Screen”, and open the app from your home screen. Safari and the
              home-screen app keep separate data, so start tracking in the installed app.
            </T>
          </View>
        </Card>
      )}
      <DogForm
        submitLabel="Start tracking"
        askTriggers
        onSubmit={async (dog, triggers) => {
          await addDog(dog, triggers);
          router.replace('/');
        }}
      />
    </Screen>
  );
}
