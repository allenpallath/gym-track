import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, ChevronLeft, Dumbbell, Flag, Plus, Timer } from 'lucide-angular';
import { ActiveSessionService } from '@core/state/active-session.service';
import { RestTimerService } from '@core/state/rest-timer.service';
import { SessionLauncherService } from '@core/state/session-launcher.service';
import { SessionStore } from '@core/state/session.store';
import { SettingsStore } from '@core/state/settings.store';
import { lastPerformance } from '@core/training/performance';
import { isRestPoint, joinNext, leaveSuperset, supersetPositions } from '@core/training/supersets';
import { addSet, createEntry, moveEntry, removeEntry, removeSet, updateSet } from '@core/utils/workout.utils';
import { Exercise, WorkoutSession, WorkoutSet } from '@shared/models';
import { ButtonComponent } from '@shared/components/button/button.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import {
  ExerciseEntryCardComponent,
  SetChange,
} from '@shared/components/exercise-entry-card/exercise-entry-card.component';
import { ExercisePickerComponent } from '@shared/components/exercise-picker/exercise-picker.component';
import { PlateCalculatorComponent } from '@shared/components/plate-calculator/plate-calculator.component';
import { RestTimerComponent } from '@shared/components/rest-timer/rest-timer.component';
import { DurationPipe } from '@shared/pipes/duration.pipe';
import { VolumePipe } from '@shared/pipes/volume.pipe';
import { ConfirmService } from '@shared/components/confirm-dialog/confirm.service';
import { PrSummaryComponent } from '../pr-summary/pr-summary.component';

@Component({
  selector: 'app-active-session-page',
  imports: [
    RouterLink,
    LucideAngularModule,
    ButtonComponent,
    EmptyStateComponent,
    ExerciseEntryCardComponent,
    ExercisePickerComponent,
    PlateCalculatorComponent,
    PrSummaryComponent,
    RestTimerComponent,
    DurationPipe,
    VolumePipe,
  ],
  templateUrl: './active-session.page.html',
  styleUrl: './active-session.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveSessionPage {
  private readonly session = inject(ActiveSessionService);
  private readonly sessionStore = inject(SessionStore);
  private readonly settingsStore = inject(SettingsStore);
  private readonly restTimer = inject(RestTimerService);
  private readonly launcher = inject(SessionLauncherService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  protected readonly icons = { ChevronLeft, Dumbbell, Flag, Plus, Timer };

  protected readonly draft = this.session.draft;
  protected readonly elapsedSec = this.session.elapsedSec;
  protected readonly totals = this.session.totals;
  protected readonly settings = this.settingsStore.settings;
  protected readonly resting = this.restTimer.active;
  protected readonly pickerOpen = signal(false);
  protected readonly finishing = signal(false);
  /** Target weight for the plate sheet; null = closed. */
  protected readonly platesFor = signal<number | null>(null);
  /** Saved session whose PRs are being celebrated before leaving. */
  protected readonly celebrating = signal<WorkoutSession | null>(null);

  protected readonly plannedSets = computed(
    () => this.draft()?.exercises.reduce((sum, e) => sum + e.sets.filter((s) => !s.warmup).length, 0) ?? 0,
  );
  protected readonly addedIds = computed<ReadonlySet<string>>(
    () => new Set(this.draft()?.exercises.map((e) => e.exerciseId) ?? []),
  );

  /** Per-entry view data, so the template doesn't call functions per render. */
  protected readonly entryViews = computed(() => {
    const draft = this.draft();
    if (!draft) return [];
    const sessions = this.sessionStore.sessions();
    const positions = supersetPositions(draft.exercises);
    return draft.exercises.map((entry, i) => ({
      entry,
      superset: positions[i],
      lastSets: (lastPerformance(sessions, entry.exerciseId)?.sets ?? null) as WorkoutSet[] | null,
      suggestion: draft.suggestions?.[entry.id] ?? null,
    }));
  });

  constructor() {
    void this.sessionStore.load();
    void this.settingsStore.load();
  }

  protected startEmpty(): void {
    void this.launcher.launch(null);
  }

  protected addExercise(exercise: Exercise): void {
    this.session.updateExercises((list) => [...list, createEntry(exercise)]);
  }

  protected onSetChanged(entryId: string, change: SetChange): void {
    const entries = this.draft()?.exercises ?? [];
    const set = entries.find((e) => e.id === entryId)?.sets.find((s) => s.id === change.setId);
    this.session.updateExercises((list) => updateSet(list, entryId, change.setId, change.patch));

    // Rest after ticking a working set — but within a superset only after the round's last exercise.
    const justTicked = change.patch.completed === true && set && !set.warmup;
    if (justTicked && isRestPoint(entries, entryId)) {
      this.restTimer.start(this.settings().restSec);
    }
  }

  protected onSetAdded(entryId: string): void {
    this.session.updateExercises((list) => addSet(list, entryId));
  }

  protected onSetRemoved(entryId: string, setId: string): void {
    this.session.updateExercises((list) => removeSet(list, entryId, setId));
  }

  protected onMoved(entryId: string, direction: -1 | 1): void {
    this.session.updateExercises((list) => moveEntry(list, entryId, direction));
  }

  protected onRemoved(entryId: string): void {
    this.session.updateExercises((list) => removeEntry(list, entryId));
  }

  protected onSuperset(entryId: string, action: 'join' | 'leave'): void {
    this.session.updateExercises((list) => (action === 'join' ? joinNext(list, entryId) : leaveSuperset(list, entryId)));
  }

  protected async discard(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Discard workout?',
      message: 'Everything you logged in this workout will be lost.',
      confirmText: 'Discard',
      cancelText: 'Keep going',
      tone: 'danger',
    });
    if (!ok) return;
    this.session.discard();
    await this.router.navigateByUrl('/routines');
  }

  protected async finish(): Promise<void> {
    if (this.finishing()) return;
    if (this.totals().sets === 0) {
      const ok = await this.confirm.ask({
        title: 'No sets ticked',
        message: 'Mark every working set as done and save this workout?',
        confirmText: 'Mark all & save',
        cancelText: 'Go back',
      });
      if (!ok) return;
      this.session.updateExercises((list) =>
        list.map((e) => ({ ...e, sets: e.sets.map((s) => (s.warmup ? s : { ...s, completed: true })) })),
      );
    }
    this.finishing.set(true);
    try {
      const saved = await this.session.finish();
      if (!saved) return;
      if (saved.prs?.length) this.celebrating.set(saved);
      else await this.openHistory(saved.id);
    } finally {
      this.finishing.set(false);
    }
  }

  protected async closeCelebration(): Promise<void> {
    const saved = this.celebrating();
    this.celebrating.set(null);
    if (saved) await this.openHistory(saved.id);
  }

  private openHistory(sessionId: string): Promise<boolean> {
    return this.router.navigate(['/history'], { queryParams: { session: sessionId } });
  }
}
