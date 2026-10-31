import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Check, Plus, SearchX } from 'lucide-angular';
import { ExerciseStore } from '@core/state/exercise.store';
import { RoutineStore } from '@core/state/routine.store';
import { ActiveSessionService } from '@core/state/active-session.service';
import { createEntry } from '@core/utils/workout.utils';
import { Exercise, Routine } from '@shared/models';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ChipComponent } from '@shared/components/chip/chip.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { BottomSheetComponent } from '@shared/components/bottom-sheet/bottom-sheet.component';
import { ExerciseImagePipe } from '@shared/pipes/exercise-image.pipe';
import { ImgFallbackDirective } from '@shared/directives/img-fallback.directive';

@Component({
  selector: 'app-exercise-detail-page',
  imports: [
    RouterLink,
    LucideAngularModule,
    ButtonComponent,
    ChipComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    BottomSheetComponent,
    ExerciseImagePipe,
    ImgFallbackDirective,
  ],
  templateUrl: './exercise-detail.page.html',
  styleUrl: './exercise-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseDetailPage {
  private readonly exerciseStore = inject(ExerciseStore);
  private readonly routineStore = inject(RoutineStore);
  private readonly router = inject(Router);
  protected readonly activeSession = inject(ActiveSessionService);

  readonly id = input.required<string>();

  protected readonly icons = { Plus, Check, SearchX };
  protected readonly status = this.exerciseStore.status;
  protected readonly routines = this.routineStore.routines;

  protected readonly exercise = computed<Exercise | undefined>(() => this.exerciseStore.byId().get(this.id()));

  protected readonly subtitle = computed(() => this.exercise()?.primaryMuscles.join(', ') ?? '');

  protected readonly tags = computed(() => {
    const e = this.exercise();
    if (!e) return [];
    return [e.level, e.equipment, e.category, e.mechanic, e.force].filter((t): t is NonNullable<typeof t> => !!t);
  });

  protected readonly sheetOpen = signal(false);
  protected readonly addedRoutineIds = signal<ReadonlySet<string>>(new Set());
  protected readonly savingId = signal<string | null>(null);
  protected readonly creating = signal(false);

  constructor() {
    void this.exerciseStore.load();
  }

  protected openSheet(): void {
    this.sheetOpen.set(true);
    void this.routineStore.load();
  }

  protected async addTo(routine: Routine): Promise<void> {
    const exercise = this.exercise();
    if (!exercise || this.savingId()) return;
    this.savingId.set(routine.id);
    try {
      await this.routineStore.save({ ...routine, exercises: [...routine.exercises, createEntry(exercise)] });
      this.addedRoutineIds.update((ids) => new Set(ids).add(routine.id));
    } finally {
      this.savingId.set(null);
    }
  }

  protected async createRoutine(): Promise<void> {
    const exercise = this.exercise();
    if (!exercise || this.creating()) return;
    this.creating.set(true);
    try {
      const saved = await this.routineStore.save(this.routineStore.createDraft(exercise.name, [createEntry(exercise)]));
      this.sheetOpen.set(false);
      await this.router.navigate(['/routines', saved.id]);
    } finally {
      this.creating.set(false);
    }
  }
}
