import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { MonthGrid, TimeField } from '@/components/inputs';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Controls';
import { Card, Screen, SectionHeader } from '@/components/ui/Layout';
import { T } from '@/components/ui/Typography';
import { fromDateKey, nowTime, todayKey } from '@/domain/dates';
import { useAppStore } from '@/store/appStore';

export default function NewWalk() {
  const params = useLocalSearchParams<{ date?: string }>();
  const [date, setDate] = useState(params.date ?? todayKey());
  const [time, setTime] = useState(() => {
    const [h, m] = nowTime().split(':').map(Number);
    return `${String(h).padStart(2, '0')}:${String(m - (m % 5)).padStart(2, '0')}`;
  });
  const [title, setTitle] = useState('Walk');
  const addWalk = useAppStore((s) => s.addWalk);

  return (
    <Screen edges={[]}>
      <TextField label="Name" value={title} onChangeText={setTitle} placeholder="e.g. Park loop" />
      <SectionHeader title="Day" />
      <Card>
        <MonthGrid selected={date} today={todayKey()} onSelect={setDate} />
      </Card>
      <T tone="secondary">{format(fromDateKey(date), 'EEEE, MMMM d')}</T>
      <SectionHeader title="Time" />
      <TimeField value={time} onChange={setTime} />
      <Button
        label="Add walk"
        disabled={!title.trim()}
        onPress={() => {
          const walk = addWalk({ date, time, title: title.trim() });
          router.replace({ pathname: '/walk/[key]', params: { key: walk.id } });
        }}
      />
    </Screen>
  );
}
