import { ExerciseEntry, WorkoutSession, WorkoutSet } from '@shared/models';
import { estimate1rm } from './one-rep-max';

/** Sets that count: completed, not warm-ups, with reps logged. */
export function workingSets(entry: ExerciseEntry): WorkoutSet[] {
  return entry.sets.filter((s) => s.completed && !s.warmup && (s.reps ?? 0) > 0);
}

export interface LastPerformance {
  /** ISO start time of that session. */
  date: string;
  sets: WorkoutSet[];
}

/**
 * Working sets from the most recent session that included the exercise.
 * `sessions` must be newest-first (SessionStore order).
 */
export function lastPerformance(sessions: WorkoutSession[], exerciseId: string): LastPerformance | null {
  for (const session of sessions) {
    const sets = session.exercises.filter((e) => e.exerciseId === exerciseId).flatMap(workingSets);
    if (sets.length) return { date: session.startedAt, sets };
  }
  return null;
}

export interface Bests {
  maxWeight: number;
  maxE1rm: number;
}

/** Best heaviest-set and estimated-1RM values for an exercise across sessions. */
export function bests(sessions: WorkoutSession[], exerciseId: string): Bests {
  let maxWeight = 0;
  let maxE1rm = 0;
  for (const session of sessions) {
    for (const entry of session.exercises) {
      if (entry.exerciseId !== exerciseId) continue;
      for (const set of workingSets(entry)) {
        maxWeight = Math.max(maxWeight, set.weight ?? 0);
        maxE1rm = Math.max(maxE1rm, estimate1rm(set.weight, set.reps));
      }
    }
  }
  return { maxWeight, maxE1rm };
}
