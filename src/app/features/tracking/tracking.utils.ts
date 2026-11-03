import { addDays, startOfDay, startOfWeek, toDayKey } from '@core/utils/date.utils';
import { estimate1rm } from '@core/training/one-rep-max';
import { workingSets } from '@core/training/performance';
import { BodyWeightEntry, PersonalRecord, WorkoutSession } from '@shared/models';

export interface WeeklyVolume {
  label: string;
  volume: number;
  isCurrent: boolean;
}

export type ProgressMetric = 'weight' | 'e1rm';

export interface ProgressPoint {
  label: string;
  value: number;
}

export interface LoggedExercise {
  id: string;
  name: string;
}

export interface BodyWeightSummary {
  points: ProgressPoint[];
  latest: BodyWeightEntry | null;
  /** kg change vs the last entry ~30 days ago; null without one. */
  change30: number | null;
}

export interface DatedRecord extends PersonalRecord {
  sessionId: string;
  date: string;
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

/** Exercises that have at least one working set, alphabetical. */
export function loggedExercises(sessions: WorkoutSession[]): LoggedExercise[] {
  const map = new Map<string, string>();
  for (const s of sessions) {
    for (const e of s.exercises) {
      if (!map.has(e.exerciseId) && workingSets(e).length) map.set(e.exerciseId, e.exerciseName);
    }
  }
  return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Per-session best for `exerciseId`, oldest first: the heaviest working set or
 * the best Epley 1RM. Warm-ups are excluded; sessions without a weighted set are skipped.
 */
export function exerciseProgress(sessions: WorkoutSession[], exerciseId: string, metric: ProgressMetric): ProgressPoint[] {
  const points: ProgressPoint[] = [];
  // Store order is newest-first; iterate backwards for a chronological series.
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i];
    let best = 0;
    for (const e of s.exercises) {
      if (e.exerciseId !== exerciseId) continue;
      for (const set of workingSets(e)) {
        const value = metric === 'weight' ? (set.weight ?? 0) : estimate1rm(set.weight, set.reps);
        best = Math.max(best, value);
      }
    }
    if (best > 0) points.push({ label: shortDate(new Date(s.startedAt)), value: best });
  }
  return points;
}

/** Chart series for the last `days` days plus the latest weight and its 30-day change. */
export function bodyWeightSummary(entries: BodyWeightEntry[], days = 90, today = new Date()): BodyWeightSummary {
  const from = toDayKey(addDays(startOfDay(today), -days));
  const monthAgo = toDayKey(addDays(startOfDay(today), -30));
  const latest = entries.at(-1) ?? null;

  // Entries are oldest-first, so the last one on/before the cutoff is the baseline.
  let baseline: BodyWeightEntry | null = null;
  for (const e of entries) {
    if (e.date <= monthAgo) baseline = e;
    else break;
  }

  const points = entries
    .filter((e) => e.date >= from)
    .map((e) => {
      const [y, m, d] = e.date.split('-').map(Number);
      return { label: shortDate(new Date(y, m - 1, d)), value: e.kg };
    });

  const change30 = latest && baseline ? Math.round((latest.kg - baseline.kg) * 10) / 10 : null;
  return { points, latest, change30 };
}

/** PRs from sessions started within the last `days` days, newest first. */
export function recentRecords(sessions: WorkoutSession[], days: number, limit: number, now = new Date()): DatedRecord[] {
  const cutoff = addDays(now, -days).toISOString();
  const out: DatedRecord[] = [];
  for (const s of sessions) {
    if (s.startedAt < cutoff) break;
    for (const pr of s.prs ?? []) {
      out.push({ ...pr, sessionId: s.id, date: s.startedAt });
      if (out.length === limit) return out;
    }
  }
  return out;
}
