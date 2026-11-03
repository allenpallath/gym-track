// Domain models shared by routines and sessions. Ids are client-generated UUID
// strings and dates are ISO-8601 strings so the same shapes can be sent to /
// received from a REST API unchanged.

export interface WorkoutSet {
  id: string;
  /** `null` = not filled in yet. */
  reps: number | null;
  /** Kilograms. `null` = not filled in / bodyweight. */
  weight: number | null;
  /** Only meaningful inside a session. */
  completed?: boolean;
  /** Warm-up sets are logged but excluded from volume, PRs and progression. */
  warmup?: boolean;
}

export type ProgressionPolicy = 'off' | 'linear' | 'double';

/** How a routine exercise's target moves up between sessions (see core/training/progression). */
export interface ProgressionRule {
  policy: ProgressionPolicy;
  /** kg added when the rule says "go up". */
  incrementKg: number;
  /** Double progression only: top of the rep range; the bottom is the planned reps. */
  repMax?: number;
}

/** One exercise inside a routine or session, with its rows of sets. */
export interface ExerciseEntry {
  /** Instance id (the same exercise can appear twice in a routine). */
  id: string;
  exerciseId: string;
  /** Denormalised so lists render without loading the catalogue. */
  exerciseName: string;
  /** First catalogue image path, e.g. `Ab_Roller/0.jpg`. */
  image: string | null;
  sets: WorkoutSet[];
  /** Consecutive entries sharing an id form a superset (done back-to-back). */
  supersetId?: string | null;
  /** Routines only; copied into sessions so the rule that produced a target is known. */
  progression?: ProgressionRule;
}

export type PrKind = 'weight' | 'e1rm';

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  kind: PrKind;
  /** kg — heaviest working set, or best estimated 1RM. */
  value: number;
  /** The best before this session. */
  previous: number;
}

export interface Routine {
  id: string;
  name: string;
  notes: string;
  exercises: ExerciseEntry[];
  createdAt: string;
  updatedAt: string;
  lastPerformedAt: string | null;
}

export interface WorkoutSession {
  id: string;
  routineId: string | null;
  routineName: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  exercises: ExerciseEntry[];
  /** Pre-computed on save (completed sets only) so history/charts stay cheap. */
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  /** Records beaten in this session, computed on finish. */
  prs?: PersonalRecord[];
}

export interface BodyWeightEntry {
  id: string;
  /** Local `YYYY-MM-DD`; one entry per day. */
  date: string;
  kg: number;
}

export interface AppSettings {
  /** Default rest between sets, in seconds. */
  restSec: number;
  /** Notify when rest ends while the app is in the background. */
  restNotifications: boolean;
  /** Plate calculator: bar weight and available plate sizes (kg, per side). */
  barKg: number;
  platesKg: number[];
  /** When the body-weight reminder was last snoozed (ISO), so it waits another cycle. */
  weightReminderSnoozedAt: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  restSec: 90,
  restNotifications: true,
  barKg: 20,
  platesKg: [25, 20, 15, 10, 5, 2.5, 1.25],
  weightReminderSnoozedAt: null,
};

/** In-progress session, persisted to localStorage so a reload doesn't lose it. */
export interface ActiveSessionDraft {
  routineId: string | null;
  routineName: string;
  startedAt: string;
  exercises: ExerciseEntry[];
}
