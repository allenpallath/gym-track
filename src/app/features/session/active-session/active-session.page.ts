import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, ChevronLeft, Dumbbell, Flag, Plus, Timer } from 'lucide-angular';
import { ActiveSessionService } from '@core/state/active-session.service';
import { SessionLauncherService } from '@core/state/session-launcher.service';
import { addSet, createEntry, moveEntry, removeEntry, removeSet, updateSet } from '@core/utils/workout.utils';
import { Exercise } from '@shared/models';
import { ButtonComponent } from '@shared/components/button/button.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import {
  ExerciseEntryCardComponent,
  SetChange,
} from '@shared/components/exercise-entry-card/exercise-entry-card.component';
import { ExercisePickerComponent } from '@shared/components/exercise-picker/exercise-picker.component';
import { DurationPipe } from '@shared/pipes/duration.pipe';
import { VolumePipe } from '@shared/pipes/volume.pipe';
import { ConfirmService } from '@shared/components/confirm-dialog/confirm.service';

@Component({
  selector: 'app-active-session-page',
  imports: [
    RouterLink,
    LucideAngularModule,
    ButtonComponent,
    EmptyStateComponent,
    ExerciseEntryCardComponent,
    ExercisePickerComponent,
    DurationPipe,
    VolumePipe,
  ],
  templateUrl: './active-session.page.html',
  styleUrl: './active-session.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveSessionPage {
  private readonly session = inject(ActiveSessionService);
  private readonly launcher = inject(SessionLauncherService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  protected readonly icons = { ChevronLeft, Dumbbell, Flag, Plus, Timer };

  protected readonly draft = this.session.draft;
  protected readonly elapsedSec = this.session.elapsedSec;
  protected readonly totals = this.session.totals;
  protected readonly pickerOpen = signal(false);
  protected readonly finishing = signal(false);

  protected readonly plannedSets = computed(
    () => this.draft()?.exercises.reduce((sum, e) => sum + e.sets.length, 0) ?? 0,
  );
  protected readonly addedIds = computed<ReadonlySet<string>>(
    () => new Set(this.draft()?.exercises.map((e) => e.exerciseId) ?? []),
  );

  protected startEmpty(): void {
    void this.launcher.launch(null);
  }

  protected addExercise(exercise: Exercise): void {
    this.session.updateExercises((list) => [...list, createEntry(exercise)]);
  }

  protected onSetChanged(entryId: string, change: SetChange): void {
    this.session.updateExercises((list) => updateSet(list, entryId, change.setId, change.patch));
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
        message: 'Mark every set as done and save this workout?',
        confirmText: 'Mark all & save',
        cancelText: 'Go back',
      });
      if (!ok) return;
      this.session.updateExercises((list) =>
        list.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, completed: true })) })),
      );
    }
    this.finishing.set(true);
    try {
      const saved = await this.session.finish();
      if (saved) await this.router.navigate(['/history'], { queryParams: { session: saved.id } });
    } finally {
      this.finishing.set(false);
    }
  }
}
