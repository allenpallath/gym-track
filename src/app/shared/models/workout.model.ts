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
}

/** In-progress session, persisted to localStorage so a reload doesn't lose it. */
export interface ActiveSessionDraft {
  routineId: string | null;
  routineName: string;
  startedAt: string;
  exercises: ExerciseEntry[];
}
