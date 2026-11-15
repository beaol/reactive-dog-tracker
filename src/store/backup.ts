import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { Dog, DogData } from '@/domain/types';

import { flushDogDataSaves, loadDogData, loadProfiles, saveDogData, saveProfiles } from './storage';

/**
 * Local-only backup. All data lives on the device; this simply lets the user
 * save a JSON file (share sheet / download) and restore it later — e.g. when
 * moving to a new phone. Nothing is ever sent to a server by the app.
 */

const FORMAT = 'reactive-dog-tracker-backup';

export interface Backup {
  format: typeof FORMAT;
  version: 1;
  exportedAt: string;
  profiles: { dog: Dog; data: DogData }[];
}

export async function buildBackup(): Promise<Backup> {
  await flushDogDataSaves();
  const { dogs } = await loadProfiles();
  const profiles = await Promise.all(dogs.map(async (dog) => ({ dog, data: await loadDogData(dog.id) })));
  return { format: FORMAT, version: 1, exportedAt: new Date().toISOString(), profiles };
}

export async function exportBackup(): Promise<void> {
  const backup = await buildBackup();
  const json = JSON.stringify(backup, null, 2);
  const name = `reactive-dog-tracker-${backup.exportedAt.slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    // iPhone home-screen apps handle downloads poorly; the share sheet lets the
    // user "Save to Files", AirDrop or mail the backup instead.
    const WebFile = globalThis.File;
    const shareFile = new WebFile([json], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [shareFile] })) {
      try {
        await navigator.share({ files: [shareFile], title: 'Reactive Dog Tracker backup' });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return; // user closed the share sheet
      }
    }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save your backup' });
}

function isBackup(value: unknown): value is Backup {
  const v = value as Backup;
  return !!v && v.format === FORMAT && Array.isArray(v.profiles) && v.profiles.every((p) => p.dog?.id && p.data);
}

/**
 * Restores profiles from a backup file. Dogs already on this device with the
 * same id are replaced by the backup copy; other dogs are kept untouched.
 * Returns the number of restored profiles, or null if the user cancelled.
 */
export async function pickAndRestoreBackup(): Promise<number | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const text = Platform.OS === 'web' && asset.file ? await asset.file.text() : await new File(asset.uri).text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not a valid backup.');
  }
  if (!isBackup(parsed)) throw new Error('That file is not a Reactive Dog Tracker backup.');

  await flushDogDataSaves();
  const current = await loadProfiles();
  const incomingIds = new Set(parsed.profiles.map((p) => p.dog.id));
  const dogs = [...current.dogs.filter((d) => !incomingIds.has(d.id)), ...parsed.profiles.map((p) => p.dog)];
  for (const p of parsed.profiles) await saveDogData(p.dog.id, p.data);
  await saveProfiles({ dogs, activeDogId: current.activeDogId ?? dogs[0]?.id });
  return parsed.profiles.length;
}
