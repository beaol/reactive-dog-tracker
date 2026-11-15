import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BREEDS } from '@/breeds/breedData';
import { resolveTraits } from '@/breeds/traits';
import { DogPortrait } from '@/components/DogPortrait';
import { T } from '@/components/ui/Typography';
import { useTheme } from '@/theme/theme';

/**
 * Developer tool: every breed and coat variant side by side, for tuning the
 * portrait renderer. Only available in development builds.
 * Params: `q` filters breed names, `all=1` shows every coat variant.
 */
export default function Gallery() {
  const theme = useTheme();
  const { q, all, size } = useLocalSearchParams<{ q?: string; all?: string; size?: string }>();
  if (!__DEV__) return null;
  const px = Number(size) || 120;
  const filter = q?.toLowerCase().split(',') ?? [];
  const breeds = BREEDS.filter((b) => !filter.length || filter.some((f) => b.name.toLowerCase().includes(f)));

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.grid}>
      {breeds.flatMap((b) =>
        (all ? b.variants : b.variants.slice(0, 1)).map((v, i) => (
          <View key={`${b.name}-${i}`} style={[styles.cell, { width: px + 8 }]}>
            <DogPortrait traits={resolveTraits(b.shape, v, 7)} size={px} backdrop={theme.primarySoft} />
            <T variant="caption" center numberOfLines={2}>
              {b.name}
              {all ? ` · ${v.label}` : ''}
            </T>
          </View>
        )),
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 8 },
  cell: { alignItems: 'center', gap: 2 },
});
