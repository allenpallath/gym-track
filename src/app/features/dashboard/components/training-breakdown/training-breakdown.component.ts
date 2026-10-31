import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { addDays, startOfDay, startOfWeek, toDayKey } from '@core/utils/date.utils';
import { WorkoutSession } from '@shared/models';
import { StatComponent } from '@shared/components/stat/stat.component';

interface DayBar {
  key: string;
  letter: string;
  minutes: number;
  /** Fill height in % of the track. */
  height: number;
  tone: 'pink' | 'lime' | 'empty';
  isToday: boolean;
}

const DAYS = 7;
/** Empty / tiny days still show a stub so the track reads as a bar. */
const MIN_FILL = 22;

/** "Training breakdown" card: last-7-days pill bars + this-week stats. */
@Component({
  selector: 'app-training-breakdown',
  imports: [StatComponent],
  templateUrl: './training-breakdown.component.html',
  styleUrl: './training-breakdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingBreakdownComponent {
  /** Newest-first list of all sessions. */
  readonly sessions = input.required<WorkoutSession[]>();

  protected readonly bars = computed<DayBar[]>(() => {
    const today = startOfDay(new Date());
    const first = addDays(today, -(DAYS - 1));
    const minutesByDay = new Map<string, number>();
    for (const s of this.sessions()) {
      const started = new Date(s.startedAt);
      if (started < first) break; // newest-first, so everything after is older
      const key = toDayKey(started);
      minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + s.durationSec / 60);
    }

    const max = Math.max(1, ...minutesByDay.values());
    return Array.from({ length: DAYS }, (_, i) => {
      const date = addDays(first, i);
      const key = toDayKey(date);
      const minutes = Math.round(minutesByDay.get(key) ?? 0);
      return {
        key,
        letter: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
        minutes,
        height: minutes ? Math.max(MIN_FILL + 8, (minutes / max) * 100) : MIN_FILL,
        tone: minutes ? (i % 2 ? 'lime' : 'pink') : 'empty',
        isToday: i === DAYS - 1,
      };
    });
  });

  protected readonly todayIndex = DAYS - 1;

  protected readonly week = computed(() => {
    const weekStart = startOfWeek(new Date());
    let seconds = 0;
    let volume = 0;
    let count = 0;
    for (const s of this.sessions()) {
      if (new Date(s.startedAt) < weekStart) break;
      seconds += s.durationSec;
      volume += s.totalVolume;
      count += 1;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const big = volume >= 10_000;
    return {
      time: hours ? `${hours}H ${minutes}M` : `${minutes}M`,
      count,
      volume: big ? (volume / 1000).toFixed(1) : Math.round(volume).toLocaleString(),
      volumeUnit: big ? 't lifted' : 'kg lifted',
    };
  });
}
