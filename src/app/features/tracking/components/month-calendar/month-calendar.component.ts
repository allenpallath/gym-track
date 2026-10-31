import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideAngularModule, ChevronLeft, ChevronRight } from 'lucide-angular';
import { addDays, startOfWeek, toDayKey } from '@core/utils/date.utils';
import { ButtonComponent } from '@shared/components/button/button.component';

interface DayCell {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  count: number;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Monday-first month grid. Days with workouts are filled lime; >1 workout adds a pink dot. */
@Component({
  selector: 'app-month-calendar',
  imports: [LucideAngularModule, ButtonComponent],
  templateUrl: './month-calendar.component.html',
  styleUrl: './month-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthCalendarComponent {
  /** Any date inside the month to show. */
  readonly month = input.required<Date>();
  /** Day key (`YYYY-MM-DD`) → number of sessions. */
  readonly counts = input.required<ReadonlyMap<string, number>>();
  readonly selectedKey = input<string | null>(null);

  readonly daySelected = output<string>();
  readonly monthChange = output<-1 | 1>();

  protected readonly icons = { ChevronLeft, ChevronRight };
  protected readonly weekdays = WEEKDAYS;

  protected readonly title = computed(() =>
    this.month().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  );

  protected readonly cells = computed<DayCell[]>(() => {
    const month = this.month();
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const gridStart = startOfWeek(first);
    // Only as many rows as the month needs (5 or 6).
    const totalDays = Math.ceil(((first.getDay() + 6) % 7 + last.getDate()) / 7) * 7;
    const todayKey = toDayKey(new Date());
    const selected = this.selectedKey();
    const counts = this.counts();

    return Array.from({ length: totalDays }, (_, i) => {
      const date = addDays(gridStart, i);
      const key = toDayKey(date);
      return {
        key,
        day: date.getDate(),
        inMonth: date.getMonth() === month.getMonth(),
        isToday: key === todayKey,
        isSelected: key === selected,
        count: counts.get(key) ?? 0,
      };
    });
  });
}
