import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { createId } from '@core/utils/id';
import { cloneEntries, computeTotals } from '@core/utils/workout.utils';
import { ActiveSessionDraft, ExerciseEntry, Routine, WorkoutSession } from '@shared/models';
import { RoutineStore } from './routine.store';
import { SessionStore } from './session.store';

const STORAGE_KEY = 'gym-track.active-session';

/**
 * Holds the workout currently in progress. Lives at root so the timer keeps
 * running while the user browses other tabs, and mirrors itself to
 * localStorage so a page reload resumes the session.
 */
@Injectable({ providedIn: 'root' })
export class ActiveSessionService {
  private readonly sessionStore = inject(SessionStore);
  private readonly routineStore = inject(RoutineStore);

  private readonly _draft = signal<ActiveSessionDraft | null>(readStoredDraft());
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
    this._draft.set({
      routineId: routine?.id ?? null,
      routineName: routine?.name ?? 'Quick workout',
      startedAt: new Date().toISOString(),
      exercises: routine ? cloneEntries(routine.exercises) : [],
    });
    this.now.set(Date.now());
  }

  /** Apply any immutable transform to the exercise list (see core/utils/workout.utils). */
  updateExercises(transform: (entries: ExerciseEntry[]) => ExerciseEntry[]): void {
    this._draft.update((d) => (d ? { ...d, exercises: transform(d.exercises) } : d));
  }

  discard(): void {
    this._draft.set(null);
  }

  /** Persists the session (completed sets only count towards totals) and clears the draft. */
  async finish(): Promise<WorkoutSession | null> {
    const draft = this._draft();
    if (!draft) return null;

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
    };

    const saved = await this.sessionStore.save(session);
    if (draft.routineId) {
      await this.routineStore.markPerformed(draft.routineId, saved.endedAt);
    }
    this._draft.set(null);
    return saved;
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

function readStoredDraft(): ActiveSessionDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveSessionDraft) : null;
  } catch {
    return null;
  }
}
