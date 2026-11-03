import { Exercise, ExerciseEntry, WorkoutSet } from '@shared/models';
import { createId } from './id';

// Pure, immutable helpers for editing ExerciseEntry[] lists. Used by both the
// routine editor and the active session so the editing behaviour is identical.

const DEFAULT_SET_COUNT = 3;
const DEFAULT_REPS = 10;

function createSet(template?: Partial<WorkoutSet>): WorkoutSet {
  return {
    id: createId(),
    reps: template?.reps ?? DEFAULT_REPS,
    weight: template?.weight ?? null,
    completed: false,
  };
}

export function createEntry(exercise: Exercise, setCount = DEFAULT_SET_COUNT): ExerciseEntry {
  return {
    id: createId(),
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    image: exercise.images[0] ?? null,
    sets: Array.from({ length: setCount }, () => createSet()),
  };
}

/** New set copies the previous row's values — that's what users want 90% of the time. */
export function addSet(entries: ExerciseEntry[], entryId: string): ExerciseEntry[] {
  return entries.map((e) => {
    if (e.id !== entryId) return e;
    const last = e.sets[e.sets.length - 1];
    return { ...e, sets: [...e.sets, createSet(last)] };
  });
}

export function updateSet(
  entries: ExerciseEntry[],
  entryId: string,
  setId: string,
  patch: Partial<Omit<WorkoutSet, 'id'>>,
): ExerciseEntry[] {
  return entries.map((e) =>
    e.id !== entryId ? e : { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) },
  );
}

export function removeSet(entries: ExerciseEntry[], entryId: string, setId: string): ExerciseEntry[] {
  return entries.map((e) => (e.id !== entryId ? e : { ...e, sets: e.sets.filter((s) => s.id !== setId) }));
}

export function removeEntry(entries: ExerciseEntry[], entryId: string): ExerciseEntry[] {
  return entries.filter((e) => e.id !== entryId);
}

export function moveEntry(entries: ExerciseEntry[], entryId: string, direction: -1 | 1): ExerciseEntry[] {
  const index = entries.findIndex((e) => e.id === entryId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= entries.length) return entries;
  const copy = [...entries];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

/**
 * Deep-copies entries with fresh ids. Used when a session is started from a
 * routine so editing the session never mutates the routine's objects.
 */
export function cloneEntries(entries: ExerciseEntry[], resetCompleted = true): ExerciseEntry[] {
  return entries.map((e) => ({
    ...e,
    id: createId(),
    sets: e.sets.map((s) => ({ ...s, id: createId(), completed: resetCompleted ? false : s.completed })),
  }));
}

export interface WorkoutTotals {
  volume: number;
  sets: number;
  reps: number;
}

/** Volume = Σ weight × reps over working sets (warm-ups excluded). Pass `completedOnly` for sessions. */
export function computeTotals(entries: ExerciseEntry[], completedOnly = false): WorkoutTotals {
  let volume = 0;
  let sets = 0;
  let reps = 0;
  for (const entry of entries) {
    for (const set of entry.sets) {
      if (set.warmup || (completedOnly && !set.completed)) continue;
      const r = set.reps ?? 0;
      sets += 1;
      reps += r;
      volume += r * (set.weight ?? 0);
    }
  }
  return { volume, sets, reps };
}
