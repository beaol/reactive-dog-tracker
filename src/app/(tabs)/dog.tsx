import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { matchBreed } from '@/breeds/matchBreed';
import { DogAvatar } from '@/components/DogPortrait';
import { DogSays } from '@/components/DogSays';
import { Button } from '@/components/ui/Button';
import { confirm, notify } from '@/components/ui/confirm';
import { Card, Row, Screen, SectionHeader } from '@/components/ui/Layout';
import { T } from '@/components/ui/Typography';
import { todayKey } from '@/domain/dates';
import { pickMessage } from '@/domain/dogVoice';
import { useActiveDog, useAppStore, useDogData } from '@/store/appStore';
import { exportBackup, pickAndRestoreBackup } from '@/store/backup';
import { Radius, Space, useTheme } from '@/theme/theme';

export default function DogScreen() {
  const theme = useTheme();
  const dog = useActiveDog();
  const data = useDogData();
  const dogs = useAppStore((s) => s.dogs);
  const activeId = useAppStore((s) => s.activeDogId);
  const [busy, setBusy] = useState(false);
  const [tipOffset, setTipOffset] = useState(0);
  const { switchDog, deleteDog, updateDog } = useAppStore.getState();

  if (!dog) return null;
  const match = matchBreed(dog.breed, dog.id);
  const successes = data.markers.filter((m) => m.kind === 'success').length;
  const walksLogged = new Set(data.markers.map((m) => m.walkId)).size;
  // Everyday "why I react & how to help" messages, browsable one by one.
  const tip = pickMessage('general', `${todayKey()}|tips|${dog.id}`, tipOffset);

  return (
    <Screen>
      <Card style={styles.hero}>
        <DogAvatar dog={dog} size={200} backdrop={theme.primarySoft} mood="happy" />
        <T variant="display" center>{dog.name}</T>
        <T tone="secondary" center>{dog.breed.trim() ? match.label : 'Breed not set'}</T>
        {match.variants.length > 1 && (
          <Button
            small
            kind="ghost"
            label={`Coat: ${match.variants[dog.coatVariant % match.variants.length].label} · change`}
            onPress={() => updateDog(dog.id, { coatVariant: (dog.coatVariant + 1) % match.variants.length })}
          />
        )}
        <Row gap={Space.xl} style={{ marginTop: Space.sm }}>
          <Stat value={successes} label="successes" />
          <Stat value={walksLogged} label="walks logged" />
          <Stat value={data.triggers.filter((t) => !t.archived).length} label="triggers" />
        </Row>
        <Button small kind="secondary" label="Edit profile" onPress={() => router.push({ pathname: '/dog-form', params: { id: dog.id } })} />
      </Card>

      <SectionHeader title={`Things ${dog.name} wants you to know`} />
      <DogSays dog={dog} message={tip} onAnother={() => setTipOffset(tipOffset + 1)} />

      <SectionHeader title="Your dogs" />
      <View style={styles.dogGrid}>
        {dogs.map((d) => (
          <Pressable
            key={d.id}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${d.name}`}
            accessibilityState={{ selected: d.id === activeId }}
            onPress={() => switchDog(d.id)}
            style={[styles.dogTile, { backgroundColor: theme.surface, borderColor: d.id === activeId ? theme.primary : theme.border }]}>
            <DogAvatar dog={d} size={72} />
            <T variant="bodyStrong" numberOfLines={1}>{d.name}</T>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add another dog"
          onPress={() => router.push('/dog-form')}
          style={[styles.dogTile, styles.addTile, { borderColor: theme.border }]}>
          <T style={{ fontSize: 32, lineHeight: 72, color: theme.primary }}>＋</T>
          <T variant="bodyStrong" tone="primary">Add dog</T>
        </Pressable>
      </View>
      <T variant="caption" tone="muted">Each dog has its own walks, triggers and history, kept completely separate.</T>

      <SectionHeader title="Your data" />
      <Card>
        <View style={{ gap: Space.md }}>
          <T tone="secondary">
            Everything is stored only on this device — no account and no cloud. Export a backup file to keep it safe or move it
            to a new phone.
          </T>
          <Row gap={Space.sm}>
            <Button small kind="secondary" label="Export backup" loading={busy} style={{ flex: 1 }} onPress={async () => {
              setBusy(true);
              try { await exportBackup(); } catch (e) { notify('Export failed', String(e)); } finally { setBusy(false); }
            }} />
            <Button small kind="secondary" label="Restore backup" style={{ flex: 1 }} onPress={async () => {
              try {
                const n = await pickAndRestoreBackup();
                if (n !== null) {
                  await useAppStore.getState().hydrate();
                  notify('Restored', `${n} dog profile${n === 1 ? '' : 's'} restored.`);
                }
              } catch (e) {
                notify('Restore failed', e instanceof Error ? e.message : String(e));
              }
            }} />
          </Row>
        </View>
      </Card>

      <Button
        kind="danger"
        label={`Delete ${dog.name}'s profile`}
        onPress={async () => {
          if (await confirm(`Delete ${dog.name}?`, `All of ${dog.name}'s walks, triggers and history will be permanently removed from this device.`)) {
            await deleteDog(dog.id);
          }
        }}
      />
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <T variant="title">{value}</T>
      <T variant="caption" tone="muted">{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Space.sm, paddingVertical: Space.xl },
  dogGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md },
  dogTile: { width: 108, alignItems: 'center', gap: 4, padding: Space.md, borderRadius: Radius.lg, borderWidth: 2 },
  addTile: { borderStyle: 'dashed' },
});
