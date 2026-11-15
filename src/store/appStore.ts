import { create } from 'zustand';

import { toDateKey } from '@/domain/dates';
import { newId } from '@/domain/ids';
import { parseOccurrenceKey } from '@/domain/schedule';
import type {
  DateKey,
  Dog,
  DogData,
  Marker,
  Trigger,
  Walk,
  WalkSchedule,
} from '@/domain/types';

import {
  deleteDogData,
  flushDogDataSaves,
  loadDogData,
  loadProfiles,
  saveDogData,
  saveProfiles,
  scheduleDogDataSave,
} from './storage';

/**
 * Application store.
 *
 * Only the *active* dog's data is held in memory (`active`). The dog id is kept
 * next to its data so that every mutation is written back to the document it
 * was read from — even if the user switches profiles mid-save.
 */

export type NewDog = Pick<Dog, 'name' | 'breed' | 'coatVariant'> & { id?: string };
export type NewTrigger = Pick<Trigger, 'name' | 'emoji'>;
export type NewSchedule = Omit<WalkSchedule, 'id' | 'createdAt'>;
export type NewMarker = Omit<Marker, 'id' | 'createdAt' | 'walkId'>;

interface ActiveDog {
  dogId: string;
  data: DogData;
}

interface AppState {
  hydrated: boolean;
  dogs: Dog[];
  activeDogId?: string;
  active: ActiveDog | null;

  hydrate(): Promise<void>;

  // Profiles
  addDog(input: NewDog, starterTriggers?: NewTrigger[]): Promise<Dog>;
  updateDog(id: string, patch: Partial<Omit<Dog, 'id' | 'createdAt'>>): Promise<void>;
  deleteDog(id: string): Promise<void>;
  switchDog(id: string): Promise<void>;

  // Triggers
  addTrigger(input: NewTrigger): Trigger;
  updateTrigger(id: string, patch: Partial<Pick<Trigger, 'name' | 'emoji' | 'archived'>>): void;
  /** Deletes when unused; archives (keeps history) when markers reference it. */
  removeTrigger(id: string): 'deleted' | 'archived';

  // Schedules
  addSchedule(input: NewSchedule): WalkSchedule;
  updateSchedule(id: string, patch: Partial<NewSchedule>): void;
  deleteSchedule(id: string): void;

  // Walks
  addWalk(input: { date: DateKey; time: string; title: string; notes?: string }): Walk;
  /** Returns the walk id for an occurrence key, creating the record if virtual. */
  ensureWalk(occurrenceKey: string): string | undefined;
  updateWalk(occurrenceKey: string, patch: Partial<Pick<Walk, 'time' | 'title' | 'notes' | 'skipped'>>): void;
  deleteWalk(occurrenceKey: string): void;

  // Markers
  addMarker(occurrenceKey: string, input: NewMarker): Marker | undefined;
  updateMarker(id: string, patch: Partial<NewMarker>): void;
  deleteMarker(id: string): void;
}

const nowIso = () => new Date().toISOString();

export const useAppStore = create<AppState>()((set, get) => {
  /** Apply a pure update to the active dog's data and persist it. */
  function mutate(update: (data: DogData) => DogData): void {
    const { active } = get();
    if (!active) throw new Error('No active dog profile');
    const data = update(active.data);
    set({ active: { dogId: active.dogId, data } });
    scheduleDogDataSave(active.dogId, data);
  }

  function requireData(): DogData {
    const { active } = get();
    if (!active) throw new Error('No active dog profile');
    return active.data;
  }

  async function persistProfiles(): Promise<void> {
    const { dogs, activeDogId } = get();
    await saveProfiles({ dogs, activeDogId });
  }

  return {
    hydrated: false,
    dogs: [],
    activeDogId: undefined,
    active: null,

    async hydrate() {
      const profiles = await loadProfiles();
      const activeDogId =
        profiles.dogs.find((d) => d.id === profiles.activeDogId)?.id ?? profiles.dogs[0]?.id;
      const active = activeDogId ? { dogId: activeDogId, data: await loadDogData(activeDogId) } : null;
      set({ hydrated: true, dogs: profiles.dogs, activeDogId, active });
    },

    async addDog(input, starterTriggers = []) {
      await flushDogDataSaves();
      const dog: Dog = {
        id: input.id ?? newId('dog_'),
        name: input.name.trim(),
        breed: input.breed.trim(),
        coatVariant: input.coatVariant,
        createdAt: nowIso(),
      };
      const data: DogData = {
        ...(await loadDogData(dog.id)),
        triggers: starterTriggers.map((t, i) => ({
          id: newId('trg_'),
          name: t.name,
          emoji: t.emoji,
          colorIndex: i,
          createdAt: nowIso(),
        })),
      };
      await saveDogData(dog.id, data);
      set((s) => ({ dogs: [...s.dogs, dog], activeDogId: dog.id, active: { dogId: dog.id, data } }));
      await persistProfiles();
      return dog;
    },

    async updateDog(id, patch) {
      set((s) => ({ dogs: s.dogs.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
      await persistProfiles();
    },

    async deleteDog(id) {
      await flushDogDataSaves();
      await deleteDogData(id);
      const dogs = get().dogs.filter((d) => d.id !== id);
      const wasActive = get().activeDogId === id;
      const activeDogId = wasActive ? dogs[0]?.id : get().activeDogId;
      const active = wasActive
        ? activeDogId
          ? { dogId: activeDogId, data: await loadDogData(activeDogId) }
          : null
        : get().active;
      set({ dogs, activeDogId, active });
      await persistProfiles();
    },

    async switchDog(id) {
      if (id === get().activeDogId) return;
      await flushDogDataSaves();
      const data = await loadDogData(id);
      set({ activeDogId: id, active: { dogId: id, data } });
      await persistProfiles();
    },

    // ── Triggers ─────────────────────────────────────────────────────────
    addTrigger(input) {
      const data = requireData();
      // Colour slots are assigned once, in order, and never re-cycled when a
      // trigger is removed — so a trigger keeps its colour forever.
      const colorIndex = data.triggers.reduce((max, t) => Math.max(max, t.colorIndex + 1), 0);
      const trigger: Trigger = {
        id: newId('trg_'),
        name: input.name.trim(),
        emoji: input.emoji,
        colorIndex,
        createdAt: nowIso(),
      };
      mutate((d) => ({ ...d, triggers: [...d.triggers, trigger] }));
      return trigger;
    },

    updateTrigger(id, patch) {
      mutate((d) => ({ ...d, triggers: d.triggers.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
    },

    removeTrigger(id) {
      const used = requireData().markers.some((m) => m.triggerId === id);
      if (used) {
        get().updateTrigger(id, { archived: true });
        return 'archived';
      }
      mutate((d) => ({ ...d, triggers: d.triggers.filter((t) => t.id !== id) }));
      return 'deleted';
    },

    // ── Schedules ────────────────────────────────────────────────────────
    addSchedule(input) {
      const schedule: WalkSchedule = { ...input, id: newId('sch_'), createdAt: nowIso() };
      mutate((d) => ({ ...d, schedules: [...d.schedules, schedule] }));
      return schedule;
    },

    updateSchedule(id, patch) {
      mutate((d) => ({ ...d, schedules: d.schedules.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
    },

    deleteSchedule(id) {
      mutate((d) => {
        // Keep materialised walks that carry history (markers or notes); they
        // become regular one-off walks. Drop empty skip-records.
        const withMarkers = new Set(d.markers.map((m) => m.walkId));
        const walks = d.walks
          .filter((w) => w.scheduleId !== id || withMarkers.has(w.id) || !!w.notes)
          .map((w) => (w.scheduleId === id ? { ...w, scheduleId: undefined } : w));
        return { ...d, schedules: d.schedules.filter((s) => s.id !== id), walks };
      });
    },

    // ── Walks ────────────────────────────────────────────────────────────
    addWalk(input) {
      const walk: Walk = { id: newId('wlk_'), ...input, createdAt: nowIso() };
      mutate((d) => ({ ...d, walks: [...d.walks, walk] }));
      return walk;
    },

    ensureWalk(key) {
      const data = requireData();
      const parsed = parseOccurrenceKey(key);
      if (parsed.kind === 'walk') {
        return data.walks.some((w) => w.id === parsed.walkId) ? parsed.walkId : undefined;
      }
      const existing = data.walks.find(
        (w) => w.scheduleId === parsed.scheduleId && w.date === parsed.date,
      );
      if (existing) return existing.id;
      const schedule = data.schedules.find((s) => s.id === parsed.scheduleId);
      if (!schedule) return undefined;
      const walk: Walk = {
        id: newId('wlk_'),
        date: parsed.date,
        time: schedule.time,
        title: schedule.title,
        scheduleId: schedule.id,
        createdAt: nowIso(),
      };
      mutate((d) => ({ ...d, walks: [...d.walks, walk] }));
      return walk.id;
    },

    updateWalk(key, patch) {
      const walkId = get().ensureWalk(key);
      if (!walkId) return;
      mutate((d) => ({ ...d, walks: d.walks.map((w) => (w.id === walkId ? { ...w, ...patch } : w)) }));
    },

    deleteWalk(key) {
      const walkId = get().ensureWalk(key);
      if (!walkId) return;
      const walk = requireData().walks.find((w) => w.id === walkId);
      if (walk?.scheduleId) {
        // A scheduled occurrence can't simply vanish (the rule would recreate
        // it), so deleting means "skip" + clear its markers.
        mutate((d) => ({
          ...d,
          walks: d.walks.map((w) => (w.id === walkId ? { ...w, skipped: true, notes: undefined } : w)),
          markers: d.markers.filter((m) => m.walkId !== walkId),
        }));
        return;
      }
      mutate((d) => ({
        ...d,
        walks: d.walks.filter((w) => w.id !== walkId),
        markers: d.markers.filter((m) => m.walkId !== walkId),
      }));
    },

    // ── Markers ──────────────────────────────────────────────────────────
    addMarker(key, input) {
      const walkId = get().ensureWalk(key);
      if (!walkId) return undefined;
      const marker: Marker = {
        ...input,
        intensity: input.kind === 'reactive' ? clampIntensity(input.intensity) : undefined,
        response: input.kind === 'success' ? input.response : undefined,
        id: newId('mrk_'),
        walkId,
        createdAt: nowIso(),
      };
      mutate((d) => ({
        ...d,
        markers: [...d.markers, marker],
        // Logging on a skipped walk means the walk did happen after all.
        walks: d.walks.map((w) => (w.id === walkId && w.skipped ? { ...w, skipped: false } : w)),
      }));
      return marker;
    },

    updateMarker(id, patch) {
      mutate((d) => ({
        ...d,
        markers: d.markers.map((m) =>
          m.id === id
            ? { ...m, ...patch, intensity: patch.intensity !== undefined ? clampIntensity(patch.intensity) : m.intensity }
            : m,
        ),
      }));
    },

    deleteMarker(id) {
      mutate((d) => ({ ...d, markers: d.markers.filter((m) => m.id !== id) }));
    },
  };
});

function clampIntensity(value: number | undefined): number {
  return Math.max(1, Math.min(10, Math.round(value ?? 5)));
}

// ── Selectors ──────────────────────────────────────────────────────────────

const EMPTY: DogData = { schemaVersion: 1, triggers: [], schedules: [], walks: [], markers: [] };

export function useActiveDog(): Dog | undefined {
  return useAppStore((s) => s.dogs.find((d) => d.id === s.activeDogId));
}

export function useDogData(): DogData {
  return useAppStore((s) => s.active?.data ?? EMPTY);
}

export const today = (): DateKey => toDateKey(new Date());
