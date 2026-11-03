import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideAngularModule, Check, Disc3, X } from 'lucide-angular';
import { WorkoutSet } from '@shared/models';

export type EntryMode = 'plan' | 'log';

/** One editable set: badge (tap = warm-up toggle) | kg | reps | (✓ in log mode) | remove. */
@Component({
  selector: 'app-set-row',
  imports: [LucideAngularModule],
  template: `
    <button
      type="button"
      class="badge"
      [class.badge--warmup]="set().warmup"
      [attr.aria-pressed]="!!set().warmup"
      [attr.aria-label]="set().warmup ? 'Warm-up set, tap to make it a working set' : 'Set ' + label() + ', tap to mark as warm-up'"
      (click)="changed.emit({ warmup: !set().warmup })"
    >
      {{ set().warmup ? 'W' : label() }}
    </button>
    <div class="kg">
      <input
        class="field-input num"
        [class.num--with-plates]="showPlates()"
        type="text"
        inputmode="decimal"
        placeholder="–"
        aria-label="Weight in kg"
        [value]="set().weight ?? ''"
        (change)="onNumber($event, 'weight')"
      />
      @if (showPlates()) {
        <button type="button" class="plates" aria-label="Show plates for this weight" (click)="platesRequested.emit(set().weight!)">
          <lucide-icon [img]="icons.Disc3" [size]="14" />
        </button>
      }
    </div>
    <input
      class="field-input num"
      type="text"
      inputmode="numeric"
      placeholder="–"
      aria-label="Reps"
      [value]="set().reps ?? ''"
      (change)="onNumber($event, 'reps')"
    />
    @if (mode() === 'log') {
      <button
        type="button"
        class="check"
        [class.check--done]="set().completed"
        [attr.aria-pressed]="!!set().completed"
        aria-label="Mark set done"
        (click)="changed.emit({ completed: !set().completed })"
      >
        <lucide-icon [img]="icons.Check" [size]="18" />
      </button>
    }
    <button type="button" class="remove" aria-label="Remove set" (click)="removed.emit()">
      <lucide-icon [img]="icons.X" [size]="16" />
    </button>
    @if (hint()) {
      <span class="hint">{{ hint() }}</span>
    }
  `,
  styleUrl: './set-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.log]': 'mode() === "log"',
    '[class.done]': 'mode() === "log" && set().completed',
  },
})
export class SetRowComponent {
  /** Display number among working sets. */
  readonly label = input.required<string>();
  readonly set = input.required<WorkoutSet>();
  readonly mode = input<EntryMode>('plan');
  /** e.g. "Last: 60 × 8". */
  readonly hint = input<string | null>(null);
  /** Enables the plate-calculator button once the weight reaches the bar. */
  readonly barKg = input<number | null>(null);

  readonly changed = output<Partial<WorkoutSet>>();
  readonly removed = output<void>();
  readonly platesRequested = output<number>();

  protected readonly icons = { Check, Disc3, X };

  protected readonly showPlates = computed(() => {
    const bar = this.barKg();
    const weight = this.set().weight;
    return bar !== null && weight !== null && weight > bar;
  });

  protected onNumber(event: Event, field: 'weight' | 'reps'): void {
    const el = event.target as HTMLInputElement;
    const raw = el.value.trim().replace(',', '.');
    if (raw === '') {
      this.changed.emit({ [field]: null });
      return;
    }
    const parsed = field === 'reps' ? parseInt(raw, 10) : parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      // Reject: restore the previous value in the DOM since the signal didn't change.
      el.value = String(this.set()[field] ?? '');
      return;
    }
    const value = field === 'weight' ? Math.round(parsed * 100) / 100 : parsed;
    el.value = String(value);
    this.changed.emit({ [field]: value });
  }
}
