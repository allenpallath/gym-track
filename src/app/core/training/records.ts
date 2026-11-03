import { ExerciseEntry, PersonalRecord, WorkoutSession } from '@shared/models';
import { bests } from './performance';

/**
 * Records this workout beat, compared with all earlier sessions.
 * An exercise's first-ever session sets a baseline rather than a PR,
 * otherwise every new exercise would celebrate.
 */
export function detectPrs(exercises: ExerciseEntry[], history: WorkoutSession[]): PersonalRecord[] {
  const current: WorkoutSession = {
    id: '',
    routineId: null,
    routineName: '',
    startedAt: '',
    endedAt: '',
    durationSec: 0,
    exercises,
    totalVolume: 0,
    totalSets: 0,
    totalReps: 0,
  };

  const prs: PersonalRecord[] = [];
  const seen = new Set<string>();
  for (const entry of exercises) {
    if (seen.has(entry.exerciseId)) continue;
    seen.add(entry.exerciseId);

    const before = bests(history, entry.exerciseId);
    const now = bests([current], entry.exerciseId);
    const base = { exerciseId: entry.exerciseId, exerciseName: entry.exerciseName };

    if (before.maxWeight > 0 && now.maxWeight > before.maxWeight) {
      prs.push({ ...base, kind: 'weight', value: now.maxWeight, previous: before.maxWeight });
    }
    if (before.maxE1rm > 0 && now.maxE1rm > before.maxE1rm) {
      prs.push({ ...base, kind: 'e1rm', value: now.maxE1rm, previous: before.maxE1rm });
    }
  }
  return prs;
}
