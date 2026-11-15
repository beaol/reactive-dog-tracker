import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DogSays } from '@/components/DogSays';
import { IntensityPicker, TRIGGER_EMOJIS, TriggerChips } from '@/components/inputs';
import { Button, haptic } from '@/components/ui/Button';
import { Chip, ChipRow, Segmented, TextField } from '@/components/ui/Controls';
import { confirm } from '@/components/ui/confirm';
import { Card, Row, Screen, SectionHeader } from '@/components/ui/Layout';
import { T } from '@/components/ui/Typography';
import { type DogMessage, messageForMoment } from '@/domain/dogVoice';
import { messageAfterReaction, messageAfterSuccess } from '@/domain/encouragement';
import { type MarkerKind, SUCCESS_RESPONSES, type SuccessResponse } from '@/domain/types';
import { useActiveDog, useAppStore, useDogData } from '@/store/appStore';
import { Space, useTheme } from '@/theme/theme';

/**
 * Log (or edit) a reactive / success moment on a walk.
 * Params: `key` occurrence key, `kind` initial kind, `id` existing marker to edit.
 */
export default function MarkerScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ key?: string; kind?: MarkerKind; id?: string }>();
  const dog = useActiveDog();
  const data = useDogData();
  const existing = data.markers.find((m) => m.id === params.id);
  const activeTriggers = data.triggers.filter((t) => !t.archived || t.id === existing?.triggerId);

  const [kind, setKind] = useState<MarkerKind>(existing?.kind ?? params.kind ?? 'reactive');
  const [triggerId, setTriggerId] = useState<string | undefined>(existing?.triggerId ?? (activeTriggers.length === 1 ? activeTriggers[0].id : undefined));
  const [intensity, setIntensity] = useState(existing?.intensity ?? 5);
  const [response, setResponse] = useState<SuccessResponse>(existing?.response ?? 'checked_in');
  const [note, setNote] = useState(existing?.note ?? '');
  const [newTrigger, setNewTrigger] = useState<string | null>(null);
  const [newEmoji, setNewEmoji] = useState(TRIGGER_EMOJIS[0]);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [dogMessage, setDogMessage] = useState<DogMessage | null>(null);

  const { addMarker, updateMarker, deleteMarker, addTrigger } = useAppStore.getState();

  const save = () => {
    if (!triggerId || !dog) return;
    const input = { kind, triggerId, intensity, response, note: note.trim() || undefined };
    if (existing) {
      updateMarker(existing.id, input);
      router.back();
      return;
    }
    const marker = params.key ? addMarker(params.key, input) : undefined;
    if (!marker) return;
    haptic('success');
    const ctx = { dogName: dog.name, seed: marker.id };
    setSavedMessage(kind === 'reactive' ? messageAfterReaction(intensity, ctx) : messageAfterSuccess(ctx));
    setDogMessage(messageForMoment(kind, intensity, marker.id));
  };

  const createTrigger = () => {
    if (!newTrigger?.trim()) return;
    const t = addTrigger({ name: newTrigger, emoji: newEmoji });
    setTriggerId(t.id);
    setNewTrigger(null);
  };

  if (savedMessage && dog) {
    const success = kind === 'success';
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: success ? 'Yay!' : 'Logged' }} />
        <Card tint={success ? theme.successSoft : theme.primarySoft} style={styles.done}>
          <T variant="title" center>{success ? `Go ${dog.name}! 🎉` : 'Thank you for logging this'}</T>
          <T center style={{ color: theme.text }}>{savedMessage}</T>
        </Card>
        {dogMessage && <DogSays dog={dog} message={dogMessage} mood={success ? 'happy' : 'calm'} avatarSize={96} />}
        <Button label="Done" onPress={() => router.back()} />
        <Button
          kind="secondary"
          label="Log another moment"
          onPress={() => {
            setSavedMessage(null);
            setNote('');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: existing ? 'Edit moment' : 'Log a moment' }} />
      <Segmented
        accessibilityLabel="Kind of moment"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'reactive', label: 'Reaction' },
          { value: 'success', label: 'Success' },
        ]}
      />
      <T tone="secondary">
        {kind === 'reactive'
          ? `${dog?.name ?? 'Your dog'} reacted to a trigger. That's okay — this is information, not failure.`
          : `${dog?.name ?? 'Your dog'} noticed a trigger and chose something other than reacting. Brilliant!`}
      </T>

      <SectionHeader title="Trigger" />
      {activeTriggers.length > 0 && <TriggerChips triggers={activeTriggers} selected={triggerId} onSelect={setTriggerId} />}
      {newTrigger === null ? (
        <Button small kind="ghost" label="+ New trigger" onPress={() => setNewTrigger('')} style={{ alignSelf: 'flex-start' }} />
      ) : (
        <Card>
          <View style={{ gap: Space.sm }}>
            <TextField value={newTrigger} onChangeText={setNewTrigger} placeholder="e.g. Delivery vans" autoFocus onSubmitEditing={createTrigger} />
            <ChipRow scroll>
              {TRIGGER_EMOJIS.map((e) => (
                <Chip key={e} label={e} selected={e === newEmoji} onPress={() => setNewEmoji(e)} />
              ))}
            </ChipRow>
            <Row>
              <Button small label="Add trigger" onPress={createTrigger} disabled={!newTrigger.trim()} />
              <Button small kind="ghost" label="Cancel" onPress={() => setNewTrigger(null)} />
            </Row>
          </View>
        </Card>
      )}

      {kind === 'reactive' ? (
        <>
          <SectionHeader title="How intense was it?" />
          <IntensityPicker value={intensity} onChange={setIntensity} />
        </>
      ) : (
        <>
          <SectionHeader title="What did your dog do instead?" />
          <ChipRow>
            {SUCCESS_RESPONSES.map((r) => (
              <Chip key={r.value} label={r.label} leading={<T>{r.emoji}</T>} selected={r.value === response} onPress={() => setResponse(r.value)} />
            ))}
          </ChipRow>
        </>
      )}

      <TextField label="Note (optional)" value={note} onChangeText={setNote} multiline placeholder="Distance, what helped, how you both felt…" />

      <Button label={existing ? 'Save changes' : 'Save'} onPress={save} disabled={!triggerId} />
      {!triggerId && <T variant="caption" tone="muted" center>Choose a trigger to save.</T>}
      {existing && (
        <Button
          kind="danger"
          label="Delete this moment"
          onPress={async () => {
            if (await confirm('Delete moment?', 'This removes it from your history.')) {
              deleteMarker(existing.id);
              router.back();
            }
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  done: { alignItems: 'center', gap: Space.md, paddingVertical: Space.xl },
});
