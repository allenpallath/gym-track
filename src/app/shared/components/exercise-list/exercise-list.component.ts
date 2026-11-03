import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { debounceTime } from 'rxjs';
import { LucideAngularModule, Check, Plus, SlidersHorizontal } from 'lucide-angular';
import { ExerciseStore } from '@core/state/exercise.store';
import {
  EQUIPMENT_TYPES,
  EXERCISE_LEVELS,
  Equipment,
  Exercise,
  ExerciseFilters,
  ExerciseLevel,
  MUSCLE_GROUPS,
  MuscleGroup,
} from '@shared/models';
import { ButtonComponent } from '../button/button.component';
import { SearchFieldComponent } from '../search-field/search-field.component';
import { ChipComponent } from '../chip/chip.component';
import { ExerciseImagePipe } from '../../pipes/exercise-image.pipe';
import { ImgFallbackDirective } from '../../directives/img-fallback.directive';

/**
 * Searchable, filterable, virtual-scrolled exercise catalogue.
 *
 * - `mode="browse"`: tapping a row emits `selected` (parent navigates to detail).
 * - `mode="pick"`: each row has an Add button that emits `added`; ids in `addedIds` show as added.
 *
 * The host is a flex column that fills its parent — the parent must give it a height.
 */
@Component({
  selector: 'app-exercise-list',
  imports: [
    ScrollingModule,
    LucideAngularModule,
    ButtonComponent,
    ChipComponent,
    SearchFieldComponent,
    ExerciseImagePipe,
    ImgFallbackDirective,
  ],
  templateUrl: './exercise-list.component.html',
  styleUrl: './exercise-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseListComponent {
  private readonly store = inject(ExerciseStore);

  readonly mode = input<'browse' | 'pick'>('browse');
  readonly addedIds = input<ReadonlySet<string>>(new Set());
  readonly selected = output<Exercise>();
  readonly added = output<Exercise>();

  protected readonly icons = { Plus, Check, SlidersHorizontal };
  protected readonly muscles = MUSCLE_GROUPS;
  protected readonly equipmentTypes = EQUIPMENT_TYPES;
  protected readonly levels = EXERCISE_LEVELS;
  /** Must match `.row` height + gap in the SCSS. */
  protected readonly itemSize = 100;

  protected readonly query = signal('');
  protected readonly muscle = signal<MuscleGroup | null>(null);
  protected readonly equipment = signal<Equipment | null>(null);
  protected readonly level = signal<ExerciseLevel | null>(null);
  protected readonly showFilters = signal(false);

  private readonly debouncedQuery = toSignal(toObservable(this.query).pipe(debounceTime(180)), { initialValue: '' });

  protected readonly status = this.store.status;

  private readonly searchResult = computed(() => {
    const filters: ExerciseFilters = {
      query: this.debouncedQuery(),
      muscle: this.muscle(),
      equipment: this.equipment(),
      level: this.level(),
    };
    return this.store.search(filters);
  });

  protected readonly results = computed(() => this.searchResult().items);
  protected readonly closeMatches = computed(() => this.searchResult().closeMatches);
  /** Every result is a close match → the user almost certainly made a typo. */
  protected readonly onlyCloseMatches = computed(
    () => this.closeMatches() > 0 && this.closeMatches() === this.results().length,
  );

  protected readonly trackById = (_: number, e: Exercise) => e.id;

  protected readonly activeFilterCount = computed(() => (this.equipment() ? 1 : 0) + (this.level() ? 1 : 0));

  constructor() {
    void this.store.load();
  }

  protected toggleMuscle(muscle: MuscleGroup | null): void {
    this.muscle.update((current) => (current === muscle ? null : muscle));
  }

  protected toggleEquipment(value: Equipment): void {
    this.equipment.update((current) => (current === value ? null : value));
  }

  protected toggleLevel(value: ExerciseLevel): void {
    this.level.update((current) => (current === value ? null : value));
  }

  protected retry(): void {
    void this.store.load();
  }

  protected onRowClick(exercise: Exercise): void {
    if (this.mode() === 'browse') this.selected.emit(exercise);
  }

  protected onAdd(event: Event, exercise: Exercise): void {
    event.stopPropagation();
    this.added.emit(exercise);
  }
}
