import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DogAvatar, type PortraitMood } from '@/components/DogPortrait';
import { T } from '@/components/ui/Typography';
import type { DogMessage } from '@/domain/dogVoice';
import type { Dog } from '@/domain/types';
import { Radius, Space, useTheme } from '@/theme/theme';

/**
 * A message from the dog, shown as a speech bubble next to their portrait.
 * "Why?" reveals the behavioural reason, so every kind word is also a true one.
 */
export function DogSays({
  dog,
  message,
  mood = 'calm',
  onAnother,
  avatarSize = 64,
}: {
  dog: Pick<Dog, 'id' | 'name' | 'breed' | 'coatVariant'>;
  message: DogMessage;
  mood?: PortraitMood;
  onAnother?: () => void;
  avatarSize?: number;
}) {
  const theme = useTheme();
  const [showWhy, setShowWhy] = useState(false);

  return (
    <View style={styles.row} accessibilityLabel={`Message from ${dog.name}: ${message.text(dog.name)}`}>
      <DogAvatar dog={dog} size={avatarSize} mood={mood} backdrop={theme.primarySoft} />
      <View style={{ flex: 1 }}>
        <View style={[styles.tail, { borderRightColor: theme.surface }]} />
        <View style={[styles.bubble, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
          <T variant="label" tone="muted">{dog.name} says</T>
          <T style={{ color: theme.text }}>“{message.text(dog.name)}”</T>
          {showWhy && (
            <View style={[styles.why, { backgroundColor: theme.surfaceAlt }]}>
              <T variant="caption" tone="secondary">💡 {message.why}</T>
            </View>
          )}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showWhy ? 'Hide explanation' : 'Why is this true?'}
              onPress={() => setShowWhy(!showWhy)}
              hitSlop={8}>
              <T variant="caption" tone="primary" style={styles.link}>{showWhy ? 'Hide' : 'Why?'}</T>
            </Pressable>
            {onAnother && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Another message from ${dog.name}`}
                onPress={() => {
                  setShowWhy(false);
                  onAnother();
                }}
                hitSlop={8}>
                <T variant="caption" tone="primary" style={styles.link}>Another message</T>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm },
  bubble: {
    borderRadius: Radius.lg,
    borderTopLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Space.md,
    gap: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  tail: {
    position: 'absolute',
    left: -7,
    top: 12,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    zIndex: 1,
  },
  why: { borderRadius: Radius.sm, padding: Space.sm },
  actions: { flexDirection: 'row', gap: Space.lg, marginTop: 2 },
  link: { fontWeight: '700' },
});
