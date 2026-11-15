import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TRIGGER_EMOJIS, TRIGGER_SUGGESTIONS } from '@/components/inputs';
import { Button } from '@/components/ui/Button';
import { Chip, ChipRow, TextField } from '@/components/ui/Controls';
import { confirm, notify } from '@/components/ui/confirm';
import { Card, EmptyState, Row, Screen, SectionHeader } from '@/components/ui/Layout';
import { T } from '@/components/ui/Typography';
import type { Trigger } from '@/domain/types';
import { useActiveDog, useAppStore, useDogData } from '@/store/appStore';
import { Space, triggerTint, useTheme } from '@/theme/theme';

export default function TriggersScreen() {
  const theme = useTheme();
  const dog = useActiveDog();
  const data = useDogData();
  const [editing, setEditing] = useState<Trigger | 'new' | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const { addTrigger } = useAppStore.getState();

  const active = data.triggers.filter((t) => !t.archived);
  const archived = data.triggers.filter((t) => t.archived);
  const unusedSuggestions = TRIGGER_SUGGESTIONS.filter(
    (s) => !data.triggers.some((t) => t.name.toLowerCase() === s.name.toLowerCase()),
  );

  const statsFor = (id: string) => {
    const ms = data.markers.filter((m) => m.triggerId === id);
    const reactive = ms.filter((m) => m.kind === 'reactive');
    const mean = reactive.length ? reactive.reduce((s, m) => s + (m.intensity ?? 0), 0) / reactive.length : null;
    return { reactive: reactive.length, success: ms.length - reactive.length, mean };
  };

  return (
    <Screen>
      <T variant="title">Triggers</T>
      <T tone="secondary">
        Triggers are the things that worry {dog?.name ?? 'your dog'}. Knowing them helps you plan routes, keep a comfortable
        distance and notice progress.
      </T>

      {editing === 'new' ? (
        <TriggerEditor onDone={() => setEditing(null)} />
      ) : (
        <Button label="+ Add trigger" onPress={() => setEditing('new')} />
      )}

      {active.length === 0 && editing !== 'new' && (
        <Card>
          <EmptyState emoji="⚡" title="No triggers yet" body="Add the things your dog reacts to — other dogs, bikes, strangers…" />
        </Card>
      )}

      {active.map((t) =>
        editing !== 'new' && editing?.id === t.id ? (
          <TriggerEditor key={t.id} trigger={t} onDone={() => setEditing(null)} />
        ) : (
          <TriggerRow key={t.id} trigger={t} stats={statsFor(t.id)} onPress={() => setEditing(t)} />
        ),
      )}

      {unusedSuggestions.length > 0 && (
        <>
          <SectionHeader title="Common triggers" />
          <ChipRow>
            {unusedSuggestions.map((s) => (
              <Chip key={s.name} label={`+ ${s.name}`} leading={<T>{s.emoji}</T>} onPress={() => addTrigger(s)} />
            ))}
          </ChipRow>
        </>
      )}

      {archived.length > 0 && (
        <>
          <SectionHeader
            title={`Archived (${archived.length})`}
            action={<Button small kind="ghost" label={showArchived ? 'Hide' : 'Show'} onPress={() => setShowArchived(!showArchived)} />}
          />
          {showArchived &&
            archived.map((t) => (
              <TriggerRow key={t.id} trigger={t} stats={statsFor(t.id)} onPress={() => useAppStore.getState().updateTrigger(t.id, { archived: false })} hint="Tap to restore" />
            ))}
        </>
      )}

      <Card tint={theme.surfaceAlt}>
        <T variant="caption" tone="secondary">
          💡 Reactivity usually comes from fear, frustration or feeling overwhelmed. Distance, predictability and lots of rest
          lower stress — and lower stress means fewer reactions.
        </T>
      </Card>
    </Screen>
  );
}

function TriggerRow({
  trigger,
  stats,
  onPress,
  hint,
}: {
  trigger: Trigger;
  stats: { reactive: number; success: number; mean: number | null };
  onPress: () => void;
  hint?: string;
}) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={`${trigger.name}. ${hint ?? 'Tap to edit'}`}>
      <Row gap={Space.md}>
        <View style={[styles.emoji, { backgroundColor: triggerTint(theme, trigger.colorIndex) }]}>
          <T style={{ fontSize: 22 }}>{trigger.emoji}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong">{trigger.name}</T>
          <T variant="caption" tone="secondary">
            {stats.reactive} reaction{stats.reactive === 1 ? '' : 's'}
            {stats.mean !== null ? ` (avg ${stats.mean.toFixed(1)})` : ''} · {stats.success} success
            {stats.success === 1 ? '' : 'es'}
          </T>
        </View>
        <T variant="caption" tone="muted">{hint ?? 'Edit'}</T>
      </Row>
    </Card>
  );
}

function TriggerEditor({ trigger, onDone }: { trigger?: Trigger; onDone: () => void }) {
  const [name, setName] = useState(trigger?.name ?? '');
  const [emoji, setEmoji] = useState(trigger?.emoji ?? TRIGGER_EMOJIS[0]);
  const { addTrigger, updateTrigger, removeTrigger } = useAppStore.getState();

  const save = () => {
    if (!name.trim()) return;
    if (trigger) updateTrigger(trigger.id, { name: name.trim(), emoji });
    else addTrigger({ name, emoji });
    onDone();
  };

  return (
    <Card>
      <View style={{ gap: Space.md }}>
        <TextField label="Trigger" value={name} onChangeText={setName} placeholder="e.g. Delivery vans" autoFocus onSubmitEditing={save} />
        <ChipRow scroll>
          {TRIGGER_EMOJIS.map((e) => (
            <Chip key={e} label={e} selected={e === emoji} onPress={() => setEmoji(e)} />
          ))}
        </ChipRow>
        <Row>
          <Button small label={trigger ? 'Save' : 'Add'} onPress={save} disabled={!name.trim()} />
          <Button small kind="ghost" label="Cancel" onPress={onDone} />
          {trigger && (
            <Button
              small
              kind="danger"
              label="Remove"
              style={{ marginLeft: 'auto' }}
              onPress={async () => {
                if (await confirm(`Remove ${trigger.name}?`, 'If you have logged moments for it, it will be archived so your history stays intact.', 'Remove')) {
                  const result = removeTrigger(trigger.id);
                  if (result === 'archived') notify('Archived', `${trigger.name} was archived to keep your history. You can restore it any time.`);
                  onDone();
                }
              }}
            />
          )}
        </Row>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  emoji: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
