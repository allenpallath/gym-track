import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { createId } from '@core/utils/id';
import { cloneEntries, computeTotals } from '@core/utils/workout.utils';
import { detectPrs } from '@core/training/records';
import { lastPerformance } from '@core/training/performance';
import { suggestNext } from '@core/training/progression';
import { ActiveSessionDraft, ExerciseEntry, Routine, WorkoutSession } from '@shared/models';
import { RestTimerService } from './rest-timer.service';
import { RoutineStore } from './routine.store';
import { SessionStore } from './session.store';

const STORAGE_KEY = 'gym-track.active-session';

/** Draft plus the progression reasons shown on each entry (keyed by entry id). */
export type SessionDraft = ActiveSessionDraft & { suggestions?: Record<string, string> };

/**
 * Holds the workout currently in progress. Lives at root so the timer keeps
 * running while the user browses other tabs, and mirrors itself to
 * localStorage so a page reload resumes the session.
 */
@Injectable({ providedIn: 'root' })
export class ActiveSessionService {
  private readonly sessionStore = inject(SessionStore);
  private readonly routineStore = inject(RoutineStore);
  private readonly restTimer = inject(RestTimerService);

  private readonly _draft = signal<SessionDraft | null>(readStoredDraft());
  /** Wall-clock tick; only advances while a session is active. */
  private readonly now = signal(Date.now());
  private tickHandle: ReturnType<typeof setInterval> | null = null;

  readonly draft = this._draft.asReadonly();
  readonly isActive = computed(() => this._draft() !== null);

  /** Derived from start time (not a counter) so it stays correct after reloads / background tabs. */
  readonly elapsedSec = computed(() => {
    const draft = this._draft();
    if (!draft) return 0;
    return Math.max(0, Math.floor((this.now() - Date.parse(draft.startedAt)) / 1000));
  });

  readonly totals = computed(() => computeTotals(this._draft()?.exercises ?? [], true));

  constructor() {
    effect(() => {
      const draft = this._draft();
      try {
        if (draft) localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage can be unavailable (private mode / quota); the session still works in memory.
      }
    });

    effect(() => (this.isActive() ? this.startTicking() : this.stopTicking()));
    inject(DestroyRef).onDestroy(() => this.stopTicking());
  }

  start(routine: Routine | null): void {
    const startedAt = new Date().toISOString();
    this.restTimer.skip();
    this._draft.set({
      routineId: routine?.id ?? null,
      routineName: routine?.name ?? 'Quick workout',
      startedAt,
      exercises: routine ? cloneEntries(routine.exercises) : [],
    });
    this.now.set(Date.now());
    // Targets need history; apply them as soon as it's loaded (usually already is).
    if (routine) void this.sessionStore.load().then(() => this.applyProgression(startedAt));
  }

  /** Apply any immutable transform to the exercise list (see core/utils/workout.utils). */
  updateExercises(transform: (entries: ExerciseEntry[]) => ExerciseEntry[]): void {
    this._draft.update((d) => (d ? { ...d, exercises: transform(d.exercises) } : d));
  }

  discard(): void {
    this.restTimer.skip();
    this._draft.set(null);
  }

  /** Persists the session (completed working sets count towards totals and PRs) and clears the draft. */
  async finish(): Promise<WorkoutSession | null> {
    const draft = this._draft();
    if (!draft) return null;

    // PRs compare against every earlier session, so history must be loaded first.
    await this.sessionStore.load();
    const prs = detectPrs(draft.exercises, this.sessionStore.sessions());

    const endedAt = new Date();
    const totals = computeTotals(draft.exercises, true);
    const session: WorkoutSession = {
      id: createId(),
      routineId: draft.routineId,
      routineName: draft.routineName,
      startedAt: draft.startedAt,
      endedAt: endedAt.toISOString(),
      durationSec: Math.max(0, Math.round((endedAt.getTime() - Date.parse(draft.startedAt)) / 1000)),
      exercises: draft.exercises,
      totalVolume: totals.volume,
      totalSets: totals.sets,
      totalReps: totals.reps,
      ...(prs.length ? { prs } : {}),
    };

    const saved = await this.sessionStore.save(session);
    if (draft.routineId) {
      await this.routineStore.markPerformed(draft.routineId, saved.endedAt);
    }
    this.restTimer.skip();
    this._draft.set(null);
    return saved;
  }

  /** Pre-fills working sets from each entry's progression rule and records why. */
  private applyProgression(startedAt: string): void {
    const draft = this._draft();
    // The user may have started another workout before history finished loading.
    if (!draft || draft.startedAt !== startedAt) return;

    const sessions = this.sessionStore.sessions();
    const suggestions: Record<string, string> = {};
    const exercises = draft.exercises.map((entry) => {
      const last = lastPerformance(sessions, entry.exerciseId)?.sets ?? null;
      const next = suggestNext(entry.progression, entry.sets, last);
      if (!next) return entry;
      suggestions[entry.id] = next.reason;
      return {
        ...entry,
        sets: entry.sets.map((s) => (s.warmup ? s : { ...s, weight: next.weight, reps: next.reps })),
      };
    });
    if (Object.keys(suggestions).length) this._draft.set({ ...draft, exercises, suggestions });
  }

  private startTicking(): void {
    if (this.tickHandle) return;
    this.now.set(Date.now());
    this.tickHandle = setInterval(() => this.now.set(Date.now()), 1000);
  }

  private stopTicking(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.tickHandle = null;
  }
}

function readStoredDraft(): SessionDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionDraft) : null;
  } catch {
    return null;
  }
}
