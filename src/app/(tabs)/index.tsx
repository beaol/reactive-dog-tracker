import { format } from 'date-fns';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DogSays } from '@/components/DogSays';
import { type DayDots, MonthGrid, WeekStrip } from '@/components/inputs';
import { WalkCard } from '@/components/WalkCard';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Controls';
import { Card, EmptyState, Row, Screen, SectionHeader } from '@/components/ui/Layout';
import { T } from '@/components/ui/Typography';
import { fromDateKey, todayKey } from '@/domain/dates';
import { dailyGreeting } from '@/domain/encouragement';
import { dailyDogMessage, voiceContext } from '@/domain/dogVoice';
import { occurrencesOn } from '@/domain/schedule';
import type { DateKey, Marker } from '@/domain/types';
import { useActiveDog, useDogData } from '@/store/appStore';
import { Space, useTheme } from '@/theme/theme';

export default function WalksScreen() {
  const theme = useTheme();
  const dog = useActiveDog();
  const data = useDogData();
  const today = todayKey();
  const [selected, setSelected] = useState<DateKey>(today);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [messageOffset, setMessageOffset] = useState(0);

  const triggers = useMemo(() => new Map(data.triggers.map((t) => [t.id, t])), [data.triggers]);
  const markersByWalk = useMemo(() => {
    const map = new Map<string, Marker[]>();
    for (const m of data.markers) map.set(m.walkId, [...(map.get(m.walkId) ?? []), m]);
    return map;
  }, [data.markers]);

  const dotsByDate = useMemo(() => {
    const walkDate = new Map(data.walks.map((w) => [w.id, w.date]));
    const map = new Map<DateKey, DayDots>();
    for (const m of data.markers) {
      const date = walkDate.get(m.walkId);
      if (!date) continue;
      const entry = map.get(date) ?? {};
      if (m.kind === 'reactive') entry.reactive = true;
      else entry.success = true;
      map.set(date, entry);
    }
    return map;
  }, [data.walks, data.markers]);

  const dotsFor = (day: DateKey): DayDots => ({
    ...dotsByDate.get(day),
    walks: occurrencesOn(day, data.schedules, data.walks).filter((o) => !o.skipped).length,
  });

  const occurrences = occurrencesOn(selected, data.schedules, data.walks);
  const greeting = dog ? dailyGreeting({ dogName: dog.name, seed: `${today}|${dog.id}` }) : '';
  const todaysWalks = occurrencesOn(today, data.schedules, data.walks);
  const voice = voiceContext({
    walks: data.walks,
    markers: data.markers,
    today,
    restDay: todaysWalks.length > 0 && todaysWalks.every((o) => o.skipped),
  });
  const dogMessage = dailyDogMessage(voice, `${today}|${dog?.id}`, messageOffset);
  const dayTitle = selected === today ? 'Today' : format(fromDateKey(selected), 'EEEE, MMM d');

  if (!dog) return null;

  return (
    <Screen>
      <View>
        <T variant="caption" tone="muted">{format(new Date(), 'EEEE, MMMM d')}</T>
        <T variant="title">Walks with {dog.name}</T>
        <T tone="secondary">💛 {greeting}</T>
      </View>

      <DogSays
        dog={dog}
        message={dogMessage}
        mood={voice === 'progress' ? 'happy' : 'calm'}
        onAnother={() => setMessageOffset(messageOffset + 1)}
      />

      <Card>
        <View style={{ gap: Space.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ width: 180 }}>
              <Segmented
                accessibilityLabel="Calendar view"
                value={view}
                onChange={setView}
                options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]}
              />
            </View>
            {selected !== today && <Button small kind="ghost" label="Today" onPress={() => setSelected(today)} />}
          </Row>
          {view === 'week' ? (
            <WeekStrip selected={selected} today={today} onSelect={setSelected} dotsFor={dotsFor} />
          ) : (
            <MonthGrid selected={selected} today={today} onSelect={setSelected} dotsFor={dotsFor} />
          )}
          <Row gap={Space.lg} style={{ justifyContent: 'center' }}>
            <Legend color={theme.reactive} label="Reaction" />
            <Legend color={theme.success} label="Success" />
            <Legend color={theme.textMuted} label="Walk planned" />
          </Row>
        </View>
      </Card>

      <SectionHeader
        title={dayTitle}
        action={<Button small kind="ghost" label="Schedules" onPress={() => router.push('/schedules')} />}
      />

      {occurrences.length === 0 ? (
        <Card>
          <EmptyState
            emoji="🐾"
            title="No walks planned"
            body={
              data.schedules.length === 0
                ? 'Set up a daily or weekly walk schedule, or add a single walk for this day.'
                : 'A quiet day. Rest and decompression are good for reactive dogs too.'
            }
          />
        </Card>
      ) : (
        occurrences.map((o) => (
          <WalkCard key={o.key} occurrence={o} markers={o.walkId ? (markersByWalk.get(o.walkId) ?? []) : []} triggers={triggers} />
        ))
      )}

      <Row gap={Space.sm}>
        <Button kind="secondary" label="Add walk" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/walk/new', params: { date: selected } })} />
        <Button kind="secondary" label="New schedule" style={{ flex: 1 }} onPress={() => router.push('/schedules/edit')} />
      </Row>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Row gap={6}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <T variant="caption" tone="secondary">{label}</T>
    </Row>
  );
}

const styles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
});
