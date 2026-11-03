import { WorkoutSession } from '@shared/models';

// Pure CSV export/import. Export is Strong-compatible (one row per set) with two
// extra columns so our own files round-trip exactly; import also reads Hevy.

export type CsvFormat = 'gymtrack' | 'strong' | 'hevy';

export interface ImportedSet {
  weight: number | null;
  reps: number | null;
  warmup: boolean;
}

export interface ImportedExercise {
  name: string;
  /** Present only in our own export. */
  exerciseId: string | null;
  sets: ImportedSet[];
}

export interface ImportedWorkout {
  name: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  exercises: ImportedExercise[];
}

const EXPORT_HEADER = [
  'Date',
  'Workout Name',
  'Duration',
  'Exercise Name',
  'Set Order',
  'Weight',
  'Reps',
  'Distance',
  'Seconds',
  'Notes',
  'Workout Notes',
  'RPE',
  'Exercise ID',
  'Set Type',
];

// ---------- export ----------

/** Completed sets of every session, oldest first. */
export function sessionsToCsv(sessions: WorkoutSession[]): string {
  const rows: string[][] = [EXPORT_HEADER];
  const ordered = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  for (const s of ordered) {
    const date = formatLocalDateTime(new Date(s.startedAt));
    const duration = formatDuration(s.durationSec);
    for (const entry of s.exercises) {
      entry.sets.forEach((set, i) => {
        if (!set.completed) return;
        rows.push([
          date,
          s.routineName,
          duration,
          entry.exerciseName,
          String(i + 1),
          set.weight == null ? '' : String(set.weight),
          set.reps == null ? '' : String(set.reps),
          '',
          '',
          '',
          '',
          '',
          entry.exerciseId,
          set.warmup ? 'warmup' : 'normal',
        ]);
      });
    }
  }
  return rows.map((r) => r.map(escapeField).join(',')).join('\r\n') + '\r\n';
}

function escapeField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** `YYYY-MM-DD HH:MM:SS` in local time, as Strong writes it. */
function formatLocalDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

// ---------- import ----------

/** RFC 4180-style parser: quoted fields, escaped quotes, commas and newlines inside quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

/** Parses a Strong, Hevy or GymTrack export into workouts. Throws on unknown formats. */
export function parseWorkoutCsv(text: string): { format: CsvFormat; workouts: ImportedWorkout[] } {
  const [header, ...body] = parseCsv(text);
  if (!header) throw new Error('The file is empty.');
  const cols = header.map((h) => h.trim().toLowerCase());
  const col = (name: string) => cols.indexOf(name);

  let format: CsvFormat;
  let read: (r: string[]) => RawRow | null;

  if (col('exercise_title') >= 0 && col('start_time') >= 0) {
    format = 'hevy';
    const [title, start, end, exercise, setType, weight, reps] = [
      'title',
      'start_time',
      'end_time',
      'exercise_title',
      'set_type',
      'weight_kg',
      'reps',
    ].map(col);
    read = (r) => {
      const startedAt = parseDate(r[start]);
      if (!startedAt) return null;
      const endedAt = parseDate(r[end]) ?? startedAt;
      return {
        workout: r[title] || 'Imported workout',
        startedAt,
        durationSec: Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000)),
        exercise: r[exercise] ?? '',
        exerciseId: null,
        set: { weight: num(r[weight]), reps: num(r[reps]), warmup: (r[setType] ?? '').toLowerCase() === 'warmup' },
      };
    };
  } else if (col('exercise name') >= 0 && col('date') >= 0) {
    format = col('exercise id') >= 0 ? 'gymtrack' : 'strong';
    const [date, workout, duration, exercise, setOrder, weight, reps, exerciseId, setType] = [
      'date',
      'workout name',
      'duration',
      'exercise name',
      'set order',
      'weight',
      'reps',
      'exercise id',
      'set type',
    ].map(col);
    read = (r) => {
      const startedAt = parseDate(r[date]);
      if (!startedAt) return null;
      const order = (r[setOrder] ?? '').trim().toUpperCase();
      const type = setType >= 0 ? (r[setType] ?? '').toLowerCase() : '';
      return {
        workout: r[workout] || 'Imported workout',
        startedAt,
        durationSec: parseDuration(r[duration] ?? ''),
        exercise: r[exercise] ?? '',
        exerciseId: exerciseId >= 0 ? r[exerciseId] || null : null,
        // Strong marks warm-ups with "W" in Set Order.
        set: { weight: num(r[weight]), reps: num(r[reps]), warmup: type === 'warmup' || order === 'W' },
      };
    };
  } else {
    throw new Error('Unrecognised CSV. Use a GymTrack, Strong or Hevy export.');
  }

  return { format, workouts: groupRows(body.map(read).filter((r): r is RawRow => !!r && !!r.exercise)) };
}

interface RawRow {
  workout: string;
  startedAt: string;
  durationSec: number;
  exercise: string;
  exerciseId: string | null;
  set: ImportedSet;
}

function groupRows(rows: RawRow[]): ImportedWorkout[] {
  const workouts = new Map<string, ImportedWorkout>();
  for (const row of rows) {
    const key = `${row.startedAt}|${row.workout}`;
    let w = workouts.get(key);
    if (!w) {
      w = {
        name: row.workout,
        startedAt: row.startedAt,
        endedAt: new Date(Date.parse(row.startedAt) + row.durationSec * 1000).toISOString(),
        durationSec: row.durationSec,
        exercises: [],
      };
      workouts.set(key, w);
    }
    // Consecutive rows of the same exercise belong to one entry; a repeat later becomes a new entry.
    const last = w.exercises.at(-1);
    if (last && last.name === row.exercise && last.exerciseId === row.exerciseId) {
      last.sets.push(row.set);
    } else {
      w.exercises.push({ name: row.exercise, exerciseId: row.exerciseId, sets: [row.set] });
    }
  }
  return [...workouts.values()];
}

function num(value: string | undefined): number | null {
  if (value == null || value.trim() === '') return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Accepts ISO, `YYYY-MM-DD HH:MM:SS` (local) and Hevy's `11 Mar 2023, 17:59`. */
function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  const local = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(v);
  const ms = local
    ? new Date(+local[1], +local[2] - 1, +local[3], +local[4], +local[5], +(local[6] ?? 0)).getTime()
    : Date.parse(v.replace(',', ''));
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** `1h 5m`, `45m`, `30s` or plain seconds. */
function parseDuration(value: string): number {
  const v = value.trim();
  if (/^\d+$/.test(v)) return Number(v);
  const part = (unit: string) => Number(new RegExp(`(\\d+)\\s*${unit}`).exec(v)?.[1] ?? 0);
  return part('h') * 3600 + part('m') * 60 + part('s');
}
