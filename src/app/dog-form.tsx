import { router, useLocalSearchParams } from 'expo-router';

import { DogForm } from '@/components/DogForm';
import { Screen } from '@/components/ui/Layout';
import { useAppStore } from '@/store/appStore';

/** Add a new dog profile (no `id`) or edit an existing one. */
export default function DogFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useAppStore((s) => s.dogs.find((d) => d.id === id));
  const { addDog, updateDog } = useAppStore.getState();

  return (
    <Screen edges={[]}>
      <DogForm
        initial={existing}
        askTriggers={!existing}
        submitLabel={existing ? 'Save' : 'Add dog'}
        onSubmit={async (dog, triggers) => {
          if (existing) await updateDog(existing.id, { name: dog.name, breed: dog.breed, coatVariant: dog.coatVariant });
          else await addDog(dog, triggers);
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }}
      />
    </Screen>
  );
}
