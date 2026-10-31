import { addDays, startOfWeek, toDayKey } from '@core/utils/date.utils';
import { WorkoutSession } from '@shared/models';

export interface WeeklyVolume {
  label: string;
  volume: number;
  isCurrent: boolean;
}

export interface ProgressPoint {
  label: string;
  weight: number;
}

export interface LoggedExercise {
  id: string;
  name: string;
}

const shortDate = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Total completed volume per Monday-based week, oldest first, ending with the current week. */
export function weeklyVolume(sessions: WorkoutSession[], weeks: number, today = new Date()): WeeklyVolume[] {
  const currentStart = startOfWeek(today);
  const buckets: WeeklyVolume[] = [];
  const indexByKey = new Map<string, number>();

  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(currentStart, -7 * i);
    indexByKey.set(toDayKey(start), buckets.length);
    buckets.push({ label: shortDate(start), volume: 0, isCurrent: i === 0 });
  }

  for (const s of sessions) {
    const index = indexByKey.get(toDayKey(startOfWeek(new Date(s.startedAt))));
    if (index !== undefined) buckets[index].volume += s.totalVolume;
  }
  return buckets;
}

/** Exercises that have at least one completed set, alphabetical. */
export function loggedExercises(sessions: WorkoutSession[]): LoggedExercise[] {
  const map = new Map<string, string>();
  for (const s of sessions) {
    for (const e of s.exercises) {
      if (!map.has(e.exerciseId) && e.sets.some((set) => set.completed)) map.set(e.exerciseId, e.exerciseName);
    }
  }
  return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

/** Heaviest completed set of `exerciseId` per session, oldest first. Sessions without one are skipped. */
export function exerciseProgress(sessions: WorkoutSession[], exerciseId: string): ProgressPoint[] {
  const points: ProgressPoint[] = [];
  // Store order is newest-first; iterate backwards for a chronological series.
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i];
    let max: number | null = null;
    for (const e of s.exercises) {
      if (e.exerciseId !== exerciseId) continue;
      for (const set of e.sets) {
        if (set.completed && set.weight != null && (max === null || set.weight > max)) max = set.weight;
      }
    }
    if (max !== null) points.push({ label: shortDate(new Date(s.startedAt)), weight: max });
  }
  return points;
}
