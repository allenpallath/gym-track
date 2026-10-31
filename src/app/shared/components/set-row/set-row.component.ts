import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideAngularModule, Check, X } from 'lucide-angular';
import { WorkoutSet } from '@shared/models';

export type EntryMode = 'plan' | 'log';

/** One editable set: number badge | kg | reps | (✓ in log mode) | remove. */
@Component({
  selector: 'app-set-row',
  imports: [LucideAngularModule],
  template: `
    <span class="badge">{{ index() }}</span>
    <input
      class="field-input num"
      type="text"
      inputmode="decimal"
      placeholder="–"
      aria-label="Weight in kg"
      [value]="set().weight ?? ''"
      (change)="onNumber($event, 'weight')"
    />
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
  `,
  styleUrl: './set-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.log]': 'mode() === "log"',
    '[class.done]': 'mode() === "log" && set().completed',
  },
})
export class SetRowComponent {
  readonly index = input.required<number>();
  readonly set = input.required<WorkoutSet>();
  readonly mode = input<EntryMode>('plan');
  readonly changed = output<Partial<WorkoutSet>>();
  readonly removed = output<void>();

  protected readonly icons = { Check, X };

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
