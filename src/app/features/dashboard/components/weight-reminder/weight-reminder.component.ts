import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { LucideAngularModule, Scale } from 'lucide-angular';
import { BottomSheetComponent } from '@shared/components/bottom-sheet/bottom-sheet.component';
import { ButtonComponent } from '@shared/components/button/button.component';

/** Fortnightly "weigh-in" prompt. The parent decides when it's due and persists the result. */
@Component({
  selector: 'app-weight-reminder',
  imports: [LucideAngularModule, BottomSheetComponent, ButtonComponent],
  templateUrl: './weight-reminder.component.html',
  styleUrl: './weight-reminder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeightReminderComponent {
  /** Last logged weight, used to pre-fill the field. */
  readonly lastKg = input<number | null>(null);
  readonly daysSinceLast = input<number | null>(null);
  readonly saving = input(false);

  readonly logged = output<number>();
  readonly snoozed = output<void>();

  protected readonly scaleIcon = Scale;
  protected readonly value = linkedSignal(() => (this.lastKg() !== null ? String(this.lastKg()) : ''));
  protected readonly kg = computed(() => parseKg(this.value()));

  protected readonly message = computed(() => {
    const days = this.daysSinceLast();
    return days === null
      ? 'Log your body weight to start tracking your trend on History.'
      : `It's been ${days} days since your last weigh-in. Step on the scale and log today's weight.`;
  });

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected submit(): void {
    const kg = this.kg();
    if (kg !== null) this.logged.emit(kg);
  }
}

/** Accepts "78.4" or "78,4"; rejects empty, zero and implausible values. */
function parseKg(raw: string): number | null {
  const n = Number(raw.trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n < 500 ? Math.round(n * 10) / 10 : null;
}
