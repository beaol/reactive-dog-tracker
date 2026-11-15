import { format } from 'date-fns';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { MonthGrid, TimeField, WeekdayPicker } from '@/components/inputs';
import { Button } from '@/components/ui/Button';
import { Segmented, TextField } from '@/components/ui/Controls';
import { confirm } from '@/components/ui/confirm';
import { Card, Screen, SectionHeader } from '@/components/ui/Layout';
import { T } from '@/components/ui/Typography';
import { addDaysKey, fromDateKey, todayKey } from '@/domain/dates';
import { describeRecurrence } from '@/domain/schedule';
import type { Recurrence, Weekday } from '@/domain/types';
import { useAppStore, useDogData } from '@/store/appStore';
import { Space } from '@/theme/theme';

export default function EditSchedule() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useDogData().schedules.find((s) => s.id === id);
  const { addSchedule, updateSchedule, deleteSchedule } = useAppStore.getState();

  const [title, setTitle] = useState(existing?.title ?? 'Morning walk');
  const [time, setTime] = useState(existing?.time ?? '08:00');
  const [kind, setKind] = useState<Recurrence['kind']>(existing?.recurrence.kind ?? 'daily');
  const [weekdays, setWeekdays] = useState<Weekday[]>(
    existing?.recurrence.kind === 'weekly' ? existing.recurrence.weekdays : [1, 3, 5],
  );
  const [startDate, setStartDate] = useState(existing?.startDate ?? todayKey());
  const [hasEnd, setHasEnd] = useState(!!existing?.endDate);
  const [endDate, setEndDate] = useState(existing?.endDate ?? addDaysKey(todayKey(), 30));
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);

  const recurrence: Recurrence = kind === 'daily' ? { kind } : { kind, weekdays };
  const valid = title.trim() && (kind === 'daily' || weekdays.length > 0) && (!hasEnd || endDate >= startDate);

  const save = () => {
    const input = { title: title.trim(), time, recurrence, startDate, endDate: hasEnd ? endDate : undefined };
    if (existing) updateSchedule(existing.id, input);
    else addSchedule(input);
    router.back();
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: existing ? 'Edit schedule' : 'New schedule' }} />
      <TextField label="Name" value={title} onChangeText={setTitle} placeholder="e.g. Morning walk" />

      <SectionHeader title="Time" />
      <TimeField value={time} onChange={setTime} />

      <SectionHeader title="Repeats" />
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: 'daily', label: 'Every day' },
          { value: 'weekly', label: 'On certain days' },
        ]}
      />
      {kind === 'weekly' && <WeekdayPicker value={weekdays} onChange={setWeekdays} />}
      <T tone="secondary">{describeRecurrence(recurrence)} at {time}</T>

      <SectionHeader title="Dates" />
      <Card>
        <View style={{ gap: Space.sm }}>
          <Button small kind="ghost" style={{ alignSelf: 'flex-start' }} label={`Starts ${format(fromDateKey(startDate), 'EEE, MMM d, yyyy')}`} onPress={() => setPicking(picking === 'start' ? null : 'start')} />
          {picking === 'start' && <MonthGrid selected={startDate} today={todayKey()} onSelect={(d) => { setStartDate(d); setPicking(null); }} />}
          <Segmented
            value={hasEnd ? 'until' : 'forever'}
            onChange={(v) => setHasEnd(v === 'until')}
            options={[
              { value: 'forever', label: 'No end date' },
              { value: 'until', label: 'Ends on…' },
            ]}
          />
          {hasEnd && (
            <>
              <Button small kind="ghost" style={{ alignSelf: 'flex-start' }} label={`Ends ${format(fromDateKey(endDate), 'EEE, MMM d, yyyy')}`} onPress={() => setPicking(picking === 'end' ? null : 'end')} />
              {picking === 'end' && <MonthGrid selected={endDate} today={todayKey()} onSelect={(d) => { setEndDate(d); setPicking(null); }} />}
              {endDate < startDate && <T variant="caption" tone="danger">The end date must be after the start date.</T>}
            </>
          )}
        </View>
      </Card>

      <Button label={existing ? 'Save schedule' : 'Create schedule'} onPress={save} disabled={!valid} />
      {existing && (
        <>
          <T variant="caption" tone="muted" center>
            Changes apply to every walk from this schedule that you haven&apos;t edited individually.
          </T>
          <Button
            kind="danger"
            label="Delete schedule"
            onPress={async () => {
              if (await confirm('Delete schedule?', 'Upcoming walks from it will disappear. Walks where you logged moments are kept.')) {
                deleteSchedule(existing.id);
                router.back();
              }
            }}
          />
        </>
      )}
    </Screen>
  );
}
