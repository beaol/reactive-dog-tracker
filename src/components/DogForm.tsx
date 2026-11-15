import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { hashString, matchBreed, suggestBreeds } from '@/breeds/matchBreed';
import { resolveTraits } from '@/breeds/traits';
import { DogPortrait } from '@/components/DogPortrait';
import { TRIGGER_SUGGESTIONS } from '@/components/inputs';
import { Button } from '@/components/ui/Button';
import { Chip, ChipRow, TextField } from '@/components/ui/Controls';
import { Card, SectionHeader } from '@/components/ui/Layout';
import { T } from '@/components/ui/Typography';
import { newId } from '@/domain/ids';
import type { Dog } from '@/domain/types';
import type { NewDog, NewTrigger } from '@/store/appStore';
import { Space, useTheme } from '@/theme/theme';

const MATCH_COPY = {
  exact: (l: string) => l,
  contains: (l: string) => l,
  fuzzy: (l: string) => `${l}?`,
  mix: (l: string) => l,
  unique: (l: string) => `${l} ✨`,
};

export function DogForm({
  initial,
  submitLabel,
  askTriggers,
  onSubmit,
}: {
  initial?: Dog;
  submitLabel: string;
  askTriggers?: boolean;
  onSubmit: (dog: NewDog, triggers: NewTrigger[]) => Promise<void> | void;
}) {
  const theme = useTheme();
  const [id] = useState(() => initial?.id ?? newId('dog_'));
  const [name, setName] = useState(initial?.name ?? '');
  const [breed, setBreed] = useState(initial?.breed ?? '');
  const [variant, setVariant] = useState(initial?.coatVariant ?? 0);
  const [triggers, setTriggers] = useState<string[]>(['Other dogs']);
  const [saving, setSaving] = useState(false);

  const match = useMemo(() => matchBreed(breed, id), [breed, id]);
  const safeVariant = variant % match.variants.length;
  const traits = useMemo(
    () => resolveTraits(match.shape, match.variants[safeVariant], hashString(`${breed}|${id}|${safeVariant}`)),
    [match, safeVariant, breed, id],
  );
  const suggestions = useMemo(() => {
    const s = suggestBreeds(breed);
    return s.length === 1 && s[0] === match.label ? [] : s;
  }, [breed, match.label]);

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit(
        { id, name, breed, coatVariant: safeVariant },
        TRIGGER_SUGGESTIONS.filter((t) => triggers.includes(t.name)),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: Space.lg }}>
      <Card style={styles.preview}>
        <DogPortrait traits={traits} size={180} backdrop={theme.primarySoft} mood="happy" />
        <T variant="title" center>{name.trim() || 'Your dog'}</T>
        <T tone="secondary" center>{breed.trim() ? MATCH_COPY[match.kind](match.label) : 'Tell us the breed to draw a portrait'}</T>
      </Card>

      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Luna" autoCapitalize="words" returnKeyType="next" />

      <View style={{ gap: Space.sm }}>
        <TextField
          label="Breed"
          value={breed}
          onChangeText={(v) => {
            setBreed(v);
            setVariant(0);
          }}
          placeholder="e.g. Border Collie, husky mix, labradoodle…"
          autoCorrect={false}
        />
        {suggestions.length > 0 && (
          <ChipRow scroll>
            {suggestions.map((s) => (
              <Chip key={s} label={s} onPress={() => { setBreed(s); setVariant(0); }} />
            ))}
          </ChipRow>
        )}
        <T variant="caption" tone="muted">
          Any breed or mix works. Unknown breeds get their own one-of-a-kind look.
        </T>
      </View>

      {breed.trim() !== '' && match.variants.length > 1 && (
        <View style={{ gap: Space.sm }}>
          <SectionHeader title="Coat" />
          <ChipRow>
            {match.variants.map((v, i) => (
              <Chip
                key={`${v.label}-${i}`}
                label={v.label}
                selected={i === safeVariant}
                onPress={() => setVariant(i)}
                leading={<View style={[styles.swatch, { backgroundColor: v.colors.base, borderColor: theme.border }]} />}
              />
            ))}
          </ChipRow>
        </View>
      )}

      {askTriggers && (
        <View style={{ gap: Space.sm }}>
          <SectionHeader title="What does your dog react to?" />
          <T variant="caption" tone="muted">Pick a few to start. You can add your own later.</T>
          <ChipRow>
            {TRIGGER_SUGGESTIONS.map((t) => {
              const on = triggers.includes(t.name);
              return (
                <Chip
                  key={t.name}
                  label={t.name}
                  leading={<T>{t.emoji}</T>}
                  selected={on}
                  onPress={() => setTriggers(on ? triggers.filter((x) => x !== t.name) : [...triggers, t.name])}
                />
              );
            })}
          </ChipRow>
        </View>
      )}

      <Button label={submitLabel} onPress={submit} disabled={!name.trim()} loading={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: 'center', gap: Space.sm },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 1 },
});
