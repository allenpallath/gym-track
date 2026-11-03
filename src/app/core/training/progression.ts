import { ProgressionRule, WorkoutSet } from '@shared/models';

export interface Suggestion {
  weight: number;
  reps: number;
  /** Short human explanation, shown next to the target. */
  reason: string;
}

const kg = (n: number) => `${Number(n.toFixed(2))} kg`;

/**
 * Next target for a routine exercise, derived from its last working sets.
 * Pure and never stored: the target is recomputed from history each session.
 *
 * - linear: every planned set hit its reps → add `incrementKg`, else repeat.
 * - double: build reps up to `repMax` (default planned + 4) at the same weight;
 *   once every set reaches it, add `incrementKg` and drop back to planned reps.
 *
 * Returns null when the rule is off, there's no history, or it was bodyweight.
 */
export function suggestNext(
  rule: ProgressionRule | undefined,
  planned: WorkoutSet[],
  last: WorkoutSet[] | null,
): Suggestion | null {
  if (!rule || rule.policy === 'off' || !last?.length) return null;

  const plannedWork = planned.filter((s) => !s.warmup);
  const plannedReps = plannedWork[0]?.reps ?? 0;
  const lastWeight = Math.max(...last.map((s) => s.weight ?? 0));
  if (lastWeight <= 0 || plannedReps <= 0) return null;

  const lastReps = last.map((s) => s.reps ?? 0);
  const minLastReps = Math.min(...lastReps);
  const enoughSets = last.length >= plannedWork.length;

  if (rule.policy === 'linear') {
    if (enoughSets && minLastReps >= plannedReps) {
      return {
        weight: lastWeight + rule.incrementKg,
        reps: plannedReps,
        reason: `Hit ${plannedWork.length}×${plannedReps} at ${kg(lastWeight)} → +${kg(rule.incrementKg)}`,
      };
    }
    return { weight: lastWeight, reps: plannedReps, reason: `Missed reps last time → repeat ${kg(lastWeight)}` };
  }

  const repMax = rule.repMax ?? plannedReps + 4;
  if (enoughSets && minLastReps >= repMax) {
    return {
      weight: lastWeight + rule.incrementKg,
      reps: plannedReps,
      reason: `${repMax} reps on every set → +${kg(rule.incrementKg)}, back to ${plannedReps}`,
    };
  }
  const nextReps = Math.min(repMax, Math.max(plannedReps, minLastReps + 1));
  return { weight: lastWeight, reps: nextReps, reason: `Add a rep: aim for ${nextReps} at ${kg(lastWeight)}` };
}
