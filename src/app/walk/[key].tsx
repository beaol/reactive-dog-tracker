import { format } from 'date-fns';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { TimeField } from '@/components/inputs';
import { MarkerPill } from '@/components/WalkCard';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Controls';
import { confirm } from '@/components/ui/confirm';
import { Card, EmptyState, Row, Screen, SectionHeader } from '@/components/ui/Layout';
import { T } from '@/components/ui/Typography';
import { formatTime, fromDateKey } from '@/domain/dates';
import { describeRecurrence, resolveOccurrence } from '@/domain/schedule';
import { SUCCESS_RESPONSES } from '@/domain/types';
import { useAppStore, useDogData } from '@/store/appStore';
import { Space, useTheme } from '@/theme/theme';

export default function WalkDetail() {
  const theme = useTheme();
  const { key } = useLocalSearchParams<{ key: string }>();
  const data = useDogData();
  const occurrence = resolveOccurrence(key, data.schedules, data.walks);
  const [editingTime, setEditingTime] = useState(false);
  const [notes, setNotes] = useState(occurrence?.notes ?? '');
  const { updateWalk, deleteWalk } = useAppStore.getState();

  if (!occurrence) {
    return (
      <Screen edges={[]}>
        <EmptyState emoji="🌿" title="This walk no longer exists" body="It may have been removed with its schedule." action={<Button label="Back" onPress={() => router.back()} />} />
      </Screen>
    );
  }

  const schedule = data.schedules.find((s) => s.id === occurrence.scheduleId);
  const markers = data.markers.filter((m) => occurrence.walkId && m.walkId === occurrence.walkId);
  const triggers = new Map(data.triggers.map((t) => [t.id, t]));
  const log = (kind: 'reactive' | 'success') => router.push({ pathname: '/marker', params: { key: occurrence.key, kind } });

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: occurrence.title }} />
      <Card>
        <View style={{ gap: Space.sm }}>
          <T variant="title">{occurrence.title}</T>
          <T tone="secondary">
            {format(fromDateKey(occurrence.date), 'EEEE, MMMM d, yyyy')} · {formatTime(occurrence.time)}
          </T>
          {schedule && <T variant="caption" tone="muted">Repeats: {describeRecurrence(schedule.recurrence)}</T>}
          {editingTime ? (
            <View style={{ gap: Space.sm }}>
              <TimeField value={occurrence.time} onChange={(time) => updateWalk(occurrence.key, { time })} />
              <Button small kind="secondary" label="Done" onPress={() => setEditingTime(false)} style={{ alignSelf: 'flex-start' }} />
            </View>
          ) : (
            <Button small kind="ghost" label="Change time for this walk" onPress={() => setEditingTime(true)} style={{ alignSelf: 'flex-start' }} />
          )}
        </View>
      </Card>

      <SectionHeader title="Moments on this walk" />
      {markers.length === 0 ? (
        <Card>
          <EmptyState emoji="🌤️" title="Nothing logged yet" body="Add a reaction or a success whenever something happens — even calm walks are worth noting." />
        </Card>
      ) : (
        markers.map((m) => {
          const response = SUCCESS_RESPONSES.find((r) => r.value === m.response);
          return (
            <Card key={m.id} onPress={() => router.push({ pathname: '/marker', params: { id: m.id } })} accessibilityLabel="Edit moment">
              <View style={{ gap: 6 }}>
                <MarkerPill marker={m} trigger={triggers.get(m.triggerId)} />
                <T variant="caption" tone="secondary">
                  {m.kind === 'reactive' ? `Intensity ${m.intensity} of 10` : `${response?.emoji} ${response?.label}`}
                  {' · '}
                  {format(new Date(m.createdAt), 'p')}
                </T>
                {m.note && <T>{m.note}</T>}
              </View>
            </Card>
          );
        })
      )}

      <Row gap={Space.sm}>
        <Button kind="reactive" label="Add reaction" style={{ flex: 1 }} onPress={() => log('reactive')} />
        <Button kind="success" label="Add success" style={{ flex: 1 }} onPress={() => log('success')} />
      </Row>

      <TextField
        label="Walk notes"
        value={notes}
        onChangeText={setNotes}
        onBlur={() => notes !== (occurrence.notes ?? '') && updateWalk(occurrence.key, { notes: notes.trim() || undefined })}
        multiline
        placeholder="Route, weather, energy level, what went well…"
      />

      <View style={{ gap: Space.sm, marginTop: Space.md }}>
        {occurrence.skipped ? (
          <Button kind="secondary" label="We did walk after all" onPress={() => updateWalk(occurrence.key, { skipped: false })} />
        ) : (
          markers.length === 0 && <Button kind="secondary" label="Skip this walk" onPress={() => updateWalk(occurrence.key, { skipped: true })} />
        )}
        <Button
          kind="danger"
          label={occurrence.scheduleId ? 'Remove this walk (keeps schedule)' : 'Delete walk'}
          onPress={async () => {
            if (await confirm('Remove walk?', markers.length ? 'Its logged moments will be deleted too.' : 'You can always add it back.', 'Remove')) {
              deleteWalk(occurrence.key);
              router.back();
            }
          }}
        />
        <T variant="caption" tone="muted" center style={{ color: theme.textMuted }}>
          Changes here only affect this one walk.
        </T>
      </View>
    </Screen>
  );
}
