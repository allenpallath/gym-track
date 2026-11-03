import { addDays, startOfDay } from '@core/utils/date.utils';
import { computeTotals } from '@core/utils/workout.utils';
import { detectPrs } from '@core/training/records';
import { ExerciseEntry, Routine, WorkoutSession, WorkoutSet } from '@shared/models';
import { GymTrackDb } from './gym-track-db';

// Dev-only demo data: 3 routines + ~8 weeks of progressive sessions so the
// dashboard, calendar and charts have something to show. Every record id starts
// with `demo-` so it can be removed without touching real data.

const DEMO_PREFIX = 'demo-';
const WEEKS = 8;

interface DemoExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  /** Starting kg; `null` = bodyweight. */
  weight: number | null;
  /** kg added per week. */
  weeklyGain: number;
}

interface DemoRoutine {
  key: string;
  name: string;
  notes: string;
  /** Weekdays (0 = Mon) this routine is usually trained. */
  days: number[];
  exercises: DemoExercise[];
}

const ROUTINES: DemoRoutine[] = [
  {
    key: 'push',
    name: 'Push',
    notes: 'Chest, shoulders, triceps',
    days: [0],
    exercises: [
      { id: 'Barbell_Bench_Press_-_Medium_Grip', name: 'Barbell Bench Press - Medium Grip', sets: 4, reps: 8, weight: 60, weeklyGain: 2.5 },
      { id: 'Incline_Dumbbell_Press', name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 22, weeklyGain: 1 },
      { id: 'Standing_Military_Press', name: 'Standing Military Press', sets: 3, reps: 8, weight: 35, weeklyGain: 1.25 },
      { id: 'Side_Lateral_Raise', name: 'Side Lateral Raise', sets: 3, reps: 12, weight: 8, weeklyGain: 0.5 },
      { id: 'Triceps_Pushdown', name: 'Triceps Pushdown', sets: 3, reps: 12, weight: 25, weeklyGain: 1 },
    ],
  },
  {
    key: 'pull',
    name: 'Pull',
    notes: 'Back and biceps',
    days: [2],
    exercises: [
      { id: 'Barbell_Deadlift', name: 'Barbell Deadlift', sets: 3, reps: 5, weight: 100, weeklyGain: 5 },
      { id: 'Pullups', name: 'Pullups', sets: 3, reps: 8, weight: null, weeklyGain: 0 },
      { id: 'Bent_Over_Barbell_Row', name: 'Bent Over Barbell Row', sets: 4, reps: 8, weight: 50, weeklyGain: 2.5 },
      { id: 'Wide-Grip_Lat_Pulldown', name: 'Wide-Grip Lat Pulldown', sets: 3, reps: 10, weight: 45, weeklyGain: 1.5 },
      { id: 'Barbell_Curl', name: 'Barbell Curl', sets: 3, reps: 10, weight: 25, weeklyGain: 1 },
    ],
  },
  {
    key: 'legs',
    name: 'Legs',
    notes: 'Quads, hamstrings, calves',
    days: [4],
    exercises: [
      { id: 'Barbell_Squat', name: 'Barbell Squat', sets: 4, reps: 6, weight: 80, weeklyGain: 3.75 },
      { id: 'Romanian_Deadlift', name: 'Romanian Deadlift', sets: 3, reps: 10, weight: 60, weeklyGain: 2.5 },
      { id: 'Leg_Press', name: 'Leg Press', sets: 3, reps: 12, weight: 120, weeklyGain: 5 },
      { id: 'Lying_Leg_Curls', name: 'Lying Leg Curls', sets: 3, reps: 12, weight: 30, weeklyGain: 1 },
      { id: 'Standing_Calf_Raises', name: 'Standing Calf Raises', sets: 4, reps: 15, weight: 40, weeklyGain: 2 },
    ],
  },
];

/** Deterministic PRNG (mulberry32) so the demo looks the same on every machine. */
function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

function buildEntries(routine: DemoRoutine, week: number, rand: () => number, live: boolean, idSuffix: string): ExerciseEntry[] {
  return routine.exercises.map((ex, exIndex) => {
    const weight = ex.weight === null ? null : roundTo(ex.weight + ex.weeklyGain * week, 1.25);
    const sets: WorkoutSet[] = Array.from({ length: ex.sets }, (_, setIndex) => {
      const isLast = setIndex === ex.sets - 1;
      // Occasionally miss reps / skip the final set, like real training logs.
      const missedReps = live && isLast && rand() < 0.3 ? 1 + Math.floor(rand() * 2) : 0;
      return {
        id: `${DEMO_PREFIX}set-${idSuffix}-${exIndex}-${setIndex}`,
        reps: ex.reps - missedReps,
        weight,
        completed: live ? !(isLast && rand() < 0.08) : false,
      };
    });
    return {
      id: `${DEMO_PREFIX}entry-${idSuffix}-${exIndex}`,
      exerciseId: ex.id,
      exerciseName: ex.name,
      image: `${ex.id}/0.jpg`,
      sets,
      ...(ex.weight !== null ? { progression: { policy: 'linear' as const, incrementKg: ex.weeklyGain >= 2.5 ? 2.5 : 1.25 } } : {}),
    };
  });
}

function buildDemoData(today = new Date()): { routines: Routine[]; sessions: WorkoutSession[] } {
  const rand = seededRandom(42);
  const todayStart = startOfDay(today);
  // Monday of the week `WEEKS - 1` weeks ago.
  const firstMonday = addDays(todayStart, -((todayStart.getDay() + 6) % 7) - (WEEKS - 1) * 7);

  const sessions: WorkoutSession[] = [];
  const lastPerformed = new Map<string, string>();

  for (let week = 0; week < WEEKS; week++) {
    for (const routine of ROUTINES) {
      for (const weekday of routine.days) {
        // Shift some workouts by a day and skip ~12% so the calendar looks organic.
        const shift = rand() < 0.25 ? 1 : 0;
        const day = addDays(firstMonday, week * 7 + weekday + shift);
        if (day >= todayStart || rand() < 0.12) continue;

        const start = new Date(day);
        start.setHours(17 + Math.floor(rand() * 3), Math.floor(rand() * 60));
        const durationSec = (45 + Math.floor(rand() * 30)) * 60;
        const end = new Date(start.getTime() + durationSec * 1000);

        const idSuffix = `${routine.key}-${week}-${weekday}`;
        const exercises = buildEntries(routine, week, rand, true, idSuffix);
        const totals = computeTotals(exercises, true);

        sessions.push({
          id: `${DEMO_PREFIX}session-${idSuffix}`,
          routineId: `${DEMO_PREFIX}routine-${routine.key}`,
          routineName: routine.name,
          startedAt: start.toISOString(),
          endedAt: end.toISOString(),
          durationSec,
          exercises,
          totalVolume: totals.volume,
          totalSets: totals.sets,
          totalReps: totals.reps,
        });
        lastPerformed.set(routine.key, end.toISOString());
      }
    }
  }

  const createdAt = firstMonday.toISOString();
  const routines: Routine[] = ROUTINES.map((routine) => ({
    id: `${DEMO_PREFIX}routine-${routine.key}`,
    name: routine.name,
    notes: routine.notes,
    // Routine targets = the latest week's working weights.
    exercises: buildEntries(routine, WEEKS - 1, rand, false, `${routine.key}-template`),
    createdAt,
    updatedAt: lastPerformed.get(routine.key) ?? createdAt,
    lastPerformedAt: lastPerformed.get(routine.key) ?? null,
  }));

  // Mark PRs the way finishing a real workout would: oldest first, against earlier sessions.
  sessions.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  sessions.forEach((session, i) => {
    const prs = detectPrs(session.exercises, sessions.slice(0, i));
    if (prs.length) session.prs = prs;
  });

  return { routines, sessions };
}

/**
 * - Empty database → inserts demo data.
 * - `?demo` in the URL → inserts demo data next to existing data (once).
 * - `?demo=clear` → removes only the demo records.
 */
export async function applyDemoSeed(db: GymTrackDb, url: URL): Promise<void> {
  const param = url.searchParams.get('demo');

  if (param === 'clear') {
    await db.transaction('rw', db.routines, db.sessions, async () => {
      await db.routines.where('id').startsWith(DEMO_PREFIX).delete();
      await db.sessions.where('id').startsWith(DEMO_PREFIX).delete();
    });
    return;
  }

  const alreadySeeded = (await db.routines.where('id').startsWith(DEMO_PREFIX).count()) > 0;
  if (alreadySeeded) return;

  const isEmpty = (await db.routines.count()) === 0 && (await db.sessions.count()) === 0;
  if (!isEmpty && param === null) return;

  const { routines, sessions } = buildDemoData();
  await db.transaction('rw', db.routines, db.sessions, async () => {
    await db.routines.bulkPut(routines);
    await db.sessions.bulkPut(sessions);
  });
}
