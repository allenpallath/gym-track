import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Dumbbell, Play, Plus, SearchX, Trash2 } from 'lucide-angular';
import { RoutineStore } from '@core/state/routine.store';
import { SessionLauncherService } from '@core/state/session-launcher.service';
import { SettingsStore } from '@core/state/settings.store';
import { joinNext, leaveSuperset, supersetPositions } from '@core/training/supersets';
import { addSet, createEntry, moveEntry, removeEntry, removeSet, updateSet } from '@core/utils/workout.utils';
import { Exercise, ExerciseEntry, ProgressionRule, Routine } from '@shared/models';
import { PlateCalculatorComponent } from '@shared/components/plate-calculator/plate-calculator.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import {
  ExerciseEntryCardComponent,
  SetChange,
} from '@shared/components/exercise-entry-card/exercise-entry-card.component';
import { ExercisePickerComponent } from '@shared/components/exercise-picker/exercise-picker.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { TextFieldComponent } from '@shared/components/text-field/text-field.component';
import { ConfirmService } from '@shared/components/confirm-dialog/confirm.service';
import { deleteRoutineDialog } from '../routine-dialogs';
import { HasUnsavedChanges } from '../unsaved-changes.guard';

/** Create (`/routines/new`) and edit (`/routines/:id`) a routine. */
@Component({
  selector: 'app-routine-editor-page',
  imports: [
    RouterLink,
    LucideAngularModule,
    ButtonComponent,
    EmptyStateComponent,
    ExerciseEntryCardComponent,
    ExercisePickerComponent,
    PageHeaderComponent,
    PlateCalculatorComponent,
    TextFieldComponent,
  ],
  templateUrl: './routine-editor.page.html',
  styleUrl: './routine-editor.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutineEditorPage implements OnInit, HasUnsavedChanges {
  private readonly store = inject(RoutineStore);
  private readonly launcher = inject(SessionLauncherService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly settingsStore = inject(SettingsStore);

  protected readonly settings = this.settingsStore.settings;
  protected readonly platesFor = signal<number | null>(null);

  /** Bound from the `:id` route param; undefined on `/routines/new`. */
  readonly id = input<string>();

  protected readonly icons = { Dumbbell, Play, Plus, SearchX, Trash2 };

  protected readonly status = signal<'loading' | 'ready' | 'not-found'>('loading');
  protected readonly saving = signal(false);
  protected readonly pickerOpen = signal(false);

  private readonly base = signal<Routine | null>(null);
  protected readonly name = signal('');
  protected readonly notes = signal('');
  protected readonly exercises = signal<ExerciseEntry[]>([]);
  private readonly savedSnapshot = signal('');

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly addedIds = computed<ReadonlySet<string>>(
    () => new Set(this.exercises().map((e) => e.exerciseId)),
  );
  protected readonly totalSets = computed(() => this.exercises().reduce((sum, e) => sum + e.sets.length, 0));
  protected readonly supersets = computed(() => supersetPositions(this.exercises()));
  protected readonly canSave = computed(
    () => this.name().trim().length > 0 && this.exercises().length > 0 && !this.saving(),
  );

  private readonly snapshot = computed(() =>
    JSON.stringify({ name: this.name().trim(), notes: this.notes(), exercises: this.exercises() }),
  );

  readonly hasUnsavedChanges = computed(
    () => this.status() === 'ready' && this.snapshot() !== this.savedSnapshot(),
  );

  async ngOnInit(): Promise<void> {
    void this.settingsStore.load();
    await this.store.load();
    const id = this.id();
    const routine = id ? this.store.byId().get(id) : this.store.createDraft();
    if (!routine) {
      this.status.set('not-found');
      return;
    }
    this.base.set(routine);
    this.name.set(routine.name);
    this.notes.set(routine.notes);
    this.exercises.set(routine.exercises);
    this.savedSnapshot.set(this.snapshot());
    this.status.set('ready');
  }

  protected addExercise(exercise: Exercise): void {
    this.exercises.update((list) => [...list, createEntry(exercise)]);
  }

  protected onSetChanged(entryId: string, change: SetChange): void {
    this.exercises.update((list) => updateSet(list, entryId, change.setId, change.patch));
  }

  protected onSetAdded(entryId: string): void {
    this.exercises.update((list) => addSet(list, entryId));
  }

  protected onSetRemoved(entryId: string, setId: string): void {
    this.exercises.update((list) => removeSet(list, entryId, setId));
  }

  protected onMoved(entryId: string, direction: -1 | 1): void {
    this.exercises.update((list) => moveEntry(list, entryId, direction));
  }

  protected onRemoved(entryId: string): void {
    this.exercises.update((list) => removeEntry(list, entryId));
  }

  protected onSuperset(entryId: string, action: 'join' | 'leave'): void {
    this.exercises.update((list) => (action === 'join' ? joinNext(list, entryId) : leaveSuperset(list, entryId)));
  }

  protected onProgression(entryId: string, rule: ProgressionRule): void {
    this.exercises.update((list) => list.map((e) => (e.id === entryId ? { ...e, progression: rule } : e)));
  }

  protected async save(): Promise<void> {
    const saved = await this.persist();
    if (saved) await this.router.navigateByUrl('/routines');
  }

  /** Saves pending edits (if valid) then starts a session from the stored routine. */
  protected async startWorkout(): Promise<void> {
    let routine = this.base();
    if (this.hasUnsavedChanges()) {
      if (!this.canSave()) return;
      routine = await this.persist();
    }
    if (routine) await this.launcher.launch(routine);
  }

  protected async delete(): Promise<void> {
    const routine = this.base();
    if (!routine || !(await this.confirm.ask(deleteRoutineDialog(routine.name)))) return;
    await this.store.delete(routine.id);
    // Mark clean so the unsaved-changes guard doesn't prompt on the way out.
    this.savedSnapshot.set(this.snapshot());
    await this.router.navigateByUrl('/routines');
  }

  private async persist(): Promise<Routine | null> {
    const base = this.base();
    if (!base || !this.canSave()) return null;
    this.saving.set(true);
    try {
      const saved = await this.store.save({
        ...base,
        name: this.name().trim(),
        notes: this.notes(),
        exercises: this.exercises(),
      });
      this.base.set(saved);
      this.savedSnapshot.set(this.snapshot());
      return saved;
    } finally {
      this.saving.set(false);
    }
  }
}
