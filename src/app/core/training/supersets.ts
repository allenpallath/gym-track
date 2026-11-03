import { createId } from '@core/utils/id';
import { ExerciseEntry } from '@shared/models';

/** Where an entry sits in a superset, for drawing the bracket. */
export type SupersetPosition = 'start' | 'middle' | 'end' | null;

// A superset is a run of CONSECUTIVE entries sharing `supersetId`; a lone id
// (e.g. after moving or removing a partner) is treated as no superset.

export function supersetPositions(entries: ExerciseEntry[]): SupersetPosition[] {
  return entries.map((entry, i) => {
    const id = entry.supersetId;
    if (!id) return null;
    const prevSame = entries[i - 1]?.supersetId === id;
    const nextSame = entries[i + 1]?.supersetId === id;
    if (prevSame && nextSame) return 'middle';
    if (nextSame) return 'start';
    if (prevSame) return 'end';
    return null;
  });
}

/** Groups the entry with the one after it (merging into an existing group if either has one). */
export function joinNext(entries: ExerciseEntry[], entryId: string): ExerciseEntry[] {
  const i = entries.findIndex((e) => e.id === entryId);
  const next = entries[i + 1];
  if (i < 0 || !next) return entries;
  const groupId = entries[i].supersetId ?? next.supersetId ?? createId();
  const absorbed = new Set([entries[i].supersetId, next.supersetId].filter((id): id is string => !!id));
  return entries.map((e, j) =>
    j === i || j === i + 1 || (e.supersetId && absorbed.has(e.supersetId)) ? { ...e, supersetId: groupId } : e,
  );
}

export function leaveSuperset(entries: ExerciseEntry[], entryId: string): ExerciseEntry[] {
  return entries.map((e) => (e.id === entryId ? { ...e, supersetId: null } : e));
}

/** Rest only after the last exercise of a superset round (or any standalone exercise). */
export function isRestPoint(entries: ExerciseEntry[], entryId: string): boolean {
  const i = entries.findIndex((e) => e.id === entryId);
  if (i < 0) return true;
  const position = supersetPositions(entries)[i];
  return position === null || position === 'end';
}
