import AsyncStorage from '@react-native-async-storage/async-storage';

import { CURRENT_SCHEMA_VERSION, type Dog, type DogData, emptyDogData } from '@/domain/types';

/**
 * Persistence layout
 * ------------------
 *   rdt/v1/profiles     → { dogs, activeDogId }
 *   rdt/v1/dog/<dogId>  → DogData   (one isolated document per dog)
 *
 * Keeping each dog in its own document is what guarantees profile isolation:
 * no code path can read another dog's walks or markers without explicitly
 * loading that dog, and deleting a profile is a single key removal.
 */

const PROFILES_KEY = 'rdt/v1/profiles';
const dogKey = (dogId: string) => `rdt/v1/dog/${dogId}`;

export interface ProfilesDoc {
  dogs: Dog[];
  activeDogId?: string;
}

export async function loadProfiles(): Promise<ProfilesDoc> {
  try {
    const raw = await AsyncStorage.getItem(PROFILES_KEY);
    return raw ? (JSON.parse(raw) as ProfilesDoc) : { dogs: [] };
  } catch (e) {
    console.warn('Could not read profiles', e);
    return { dogs: [] };
  }
}

export async function saveProfiles(doc: ProfilesDoc): Promise<void> {
  await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(doc));
}

function migrate(data: Partial<DogData>): DogData {
  // Version 1 is the first schema; future migrations chain from here.
  return { ...emptyDogData(), ...data, schemaVersion: CURRENT_SCHEMA_VERSION };
}

export async function loadDogData(dogId: string): Promise<DogData> {
  try {
    const raw = await AsyncStorage.getItem(dogKey(dogId));
    return raw ? migrate(JSON.parse(raw)) : emptyDogData();
  } catch (e) {
    console.warn(`Could not read data for dog ${dogId}`, e);
    return emptyDogData();
  }
}

export async function saveDogData(dogId: string, data: DogData): Promise<void> {
  await AsyncStorage.setItem(dogKey(dogId), JSON.stringify(data));
}

export async function deleteDogData(dogId: string): Promise<void> {
  await AsyncStorage.removeItem(dogKey(dogId));
}

/**
 * Coalesces rapid successive writes per dog (e.g. editing a note) into one
 * write, while never letting one dog's pending write be attributed to another.
 */
const pending = new Map<string, { timer: ReturnType<typeof setTimeout>; data: DogData }>();

export function scheduleDogDataSave(dogId: string, data: DogData, delayMs = 250): void {
  const existing = pending.get(dogId);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    pending.delete(dogId);
    saveDogData(dogId, data).catch((e) => console.warn('Save failed', e));
  }, delayMs);
  pending.set(dogId, { timer, data });
}

export async function flushDogDataSaves(): Promise<void> {
  const entries = [...pending.entries()];
  pending.clear();
  await Promise.all(
    entries.map(([dogId, { timer, data }]) => {
      clearTimeout(timer);
      return saveDogData(dogId, data);
    }),
  );
}
