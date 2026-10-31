// Mirrors the schema of yuhonas/free-exercise-db (public domain).

export const MUSCLE_GROUPS = [
  'abdominals',
  'abductors',
  'adductors',
  'biceps',
  'calves',
  'chest',
  'forearms',
  'glutes',
  'hamstrings',
  'lats',
  'lower back',
  'middle back',
  'neck',
  'quadriceps',
  'shoulders',
  'traps',
  'triceps',
] as const;

export const EQUIPMENT_TYPES = [
  'body only',
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'kettlebells',
  'bands',
  'medicine ball',
  'exercise ball',
  'e-z curl bar',
  'foam roll',
  'other',
] as const;

export const EXERCISE_CATEGORIES = [
  'strength',
  'stretching',
  'plyometrics',
  'powerlifting',
  'olympic weightlifting',
  'strongman',
  'cardio',
] as const;

export const EXERCISE_LEVELS = ['beginner', 'intermediate', 'expert'] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type Equipment = (typeof EQUIPMENT_TYPES)[number];
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];
export type ExerciseLevel = (typeof EXERCISE_LEVELS)[number];
export type ExerciseForce = 'push' | 'pull' | 'static';
export type ExerciseMechanic = 'compound' | 'isolation';

export interface Exercise {
  id: string;
  name: string;
  force: ExerciseForce | null;
  level: ExerciseLevel;
  mechanic: ExerciseMechanic | null;
  equipment: Equipment | null;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  instructions: string[];
  category: ExerciseCategory;
  /** Paths relative to the image CDN, e.g. `Ab_Roller/0.jpg`. Resolve with the `exerciseImage` pipe. */
  images: string[];
}

export interface ExerciseFilters {
  query: string;
  muscle: MuscleGroup | null;
  equipment: Equipment | null;
  level: ExerciseLevel | null;
  category: ExerciseCategory | null;
}

export const EMPTY_EXERCISE_FILTERS: ExerciseFilters = {
  query: '',
  muscle: null,
  equipment: null,
  level: null,
  category: null,
};
