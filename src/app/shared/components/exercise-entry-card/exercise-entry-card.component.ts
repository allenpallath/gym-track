import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowDown,
  ArrowUp,
  EllipsisVertical,
  Link2,
  Plus,
  Trash2,
  TrendingUp,
  Unlink2,
} from 'lucide-angular';
import { SupersetPosition } from '@core/training/supersets';
import { ExerciseEntry, ProgressionPolicy, ProgressionRule, WorkoutSet } from '@shared/models';
import { ButtonComponent } from '../button/button.component';
import { SelectComponent, SelectOption } from '../select/select.component';
import { SetRowComponent, EntryMode } from '../set-row/set-row.component';
import { ExerciseImagePipe } from '../../pipes/exercise-image.pipe';
import { ImgFallbackDirective } from '../../directives/img-fallback.directive';

export interface SetChange {
  setId: string;
  patch: Partial<WorkoutSet>;
}

interface SetRowView {
  set: WorkoutSet;
  label: string;
  hint: string | null;
}

const DEFAULT_RULE: ProgressionRule = { policy: 'off', incrementKg: 2.5 };

const POLICY_OPTIONS: SelectOption<ProgressionPolicy>[] = [
  { value: 'off', label: 'Off' },
  { value: 'linear', label: 'Linear' },
  { value: 'double', label: 'Double (reps → kg)' },
];

/** An exercise with its set rows. Used by the routine editor (`plan`) and live session (`log`). */
@Component({
  selector: 'app-exercise-entry-card',
  imports: [
    RouterLink,
    LucideAngularModule,
    ButtonComponent,
    SelectComponent,
    SetRowComponent,
    ExerciseImagePipe,
    ImgFallbackDirective,
  ],
  templateUrl: './exercise-entry-card.component.html',
  styleUrl: './exercise-entry-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"ss-" + (superset() ?? "none")',
  },
})
export class ExerciseEntryCardComponent {
  readonly entry = input.required<ExerciseEntry>();
  readonly mode = input<EntryMode>('plan');
  readonly isFirst = input(false);
  readonly isLast = input(false);
  /** Working sets from the last session with this exercise (log mode hints). */
  readonly lastSets = input<WorkoutSet[] | null>(null);
  /** Why the targets were pre-filled, from the progression rule. */
  readonly suggestion = input<string | null>(null);
  readonly superset = input<SupersetPosition>(null);
  readonly barKg = input<number | null>(null);

  readonly setChanged = output<SetChange>();
  readonly setAdded = output<void>();
  readonly setRemoved = output<string>();
  readonly moved = output<-1 | 1>();
  readonly removed = output<void>();
  readonly supersetChanged = output<'join' | 'leave'>();
  readonly progressionChanged = output<ProgressionRule>();
  readonly platesRequested = output<number>();

  protected readonly menuOpen = signal(false);
  protected readonly icons = { ArrowDown, ArrowUp, EllipsisVertical, Link2, Plus, Trash2, TrendingUp, Unlink2 };
  protected readonly policyOptions = POLICY_OPTIONS;

  /** Labels count working sets only; hints pair the Nth working set with last time's Nth. */
  protected readonly rows = computed<SetRowView[]>(() => {
    const last = this.lastSets();
    let working = 0;
    return this.entry().sets.map((set) => {
      if (set.warmup) return { set, label: 'W', hint: null };
      const prev = last?.[working];
      working += 1;
      return { set, label: String(working), hint: prev ? formatLast(prev) : null };
    });
  });

  protected readonly rule = computed(() => this.entry().progression ?? DEFAULT_RULE);
  protected readonly inSuperset = computed(() => this.superset() !== null);

  protected move(direction: -1 | 1): void {
    this.menuOpen.set(false);
    this.moved.emit(direction);
  }

  protected remove(): void {
    this.menuOpen.set(false);
    this.removed.emit();
  }

  protected changeSuperset(action: 'join' | 'leave'): void {
    this.menuOpen.set(false);
    this.supersetChanged.emit(action);
  }

  protected setPolicy(policy: ProgressionPolicy | null): void {
    if (policy) this.progressionChanged.emit({ ...this.rule(), policy });
  }

  protected setRuleNumber(event: Event, field: 'incrementKg' | 'repMax'): void {
    const el = event.target as HTMLInputElement;
    const value = parseFloat(el.value.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      el.value = String(this.rule()[field] ?? '');
      return;
    }
    this.progressionChanged.emit({ ...this.rule(), [field]: field === 'repMax' ? Math.round(value) : value });
  }
}

function formatLast(set: WorkoutSet): string {
  return set.weight ? `Last: ${set.weight} × ${set.reps}` : `Last: ${set.reps} reps`;
}
