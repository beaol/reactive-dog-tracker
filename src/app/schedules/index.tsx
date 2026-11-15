import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card, EmptyState, Row, Screen } from '@/components/ui/Layout';
import { T } from '@/components/ui/Typography';
import { formatTime, fromDateKey } from '@/domain/dates';
import { describeRecurrence } from '@/domain/schedule';
import { useDogData } from '@/store/appStore';
import { Space, useTheme } from '@/theme/theme';

export default function Schedules() {
  const theme = useTheme();
  const { schedules } = useDogData();
  const sorted = [...schedules].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <Screen edges={[]}>
      <T tone="secondary">
        Schedules add walks to your calendar automatically. A predictable routine helps many reactive dogs feel safer.
      </T>
      {sorted.length === 0 ? (
        <Card>
          <EmptyState emoji="🗓️" title="No schedules yet" body="Create a daily or weekly walk routine." />
        </Card>
      ) : (
        sorted.map((s) => (
          <Card key={s.id} onPress={() => router.push({ pathname: '/schedules/edit', params: { id: s.id } })} accessibilityLabel={`Edit ${s.title}`}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ gap: 2, flex: 1 }}>
                <T variant="bodyStrong">{s.title}</T>
                <T variant="caption" tone="secondary">
                  {formatTime(s.time)} · {describeRecurrence(s.recurrence)}
                </T>
                <T variant="caption" tone="muted">
                  From {format(fromDateKey(s.startDate), 'MMM d, yyyy')}
                  {s.endDate ? ` until ${format(fromDateKey(s.endDate), 'MMM d, yyyy')}` : ''}
                </T>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Row>
          </Card>
        ))
      )}
      <View style={{ marginTop: Space.sm }}>
        <Button label="New schedule" onPress={() => router.push('/schedules/edit')} />
      </View>
    </Screen>
  );
}
