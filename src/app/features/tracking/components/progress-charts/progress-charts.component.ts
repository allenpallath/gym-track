import { ChangeDetectionStrategy, Component, computed, DOCUMENT, inject, input, linkedSignal, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { WorkoutSession } from '@shared/models';
import { CardComponent } from '@shared/components/card/card.component';
import { ChipComponent } from '@shared/components/chip/chip.component';
import { SelectComponent, SelectOption } from '@shared/components/select/select.component';
import { exerciseProgress, loggedExercises, ProgressMetric, weeklyVolume } from '../../tracking.utils';
import { jellyBarsPlugin, jellyGlowPlugin, withAlpha } from './jelly-chart.plugins';
import { chartOptions, jellyLineDataset, provideGymCharts, readThemeColors } from './chart-theme';

const WEEKS = 8;
const BAR_RADIUS = 10;

const METRIC_CAPTION: Record<ProgressMetric, string> = {
  weight: 'Heaviest working set per session',
  e1rm: 'Best estimated 1RM per session (Epley)',
};

/** Weekly volume + per-exercise progress. Only rendered inside `@defer`, so Chart.js stays lazy. */
@Component({
  selector: 'app-progress-charts',
  imports: [BaseChartDirective, CardComponent, ChipComponent, SelectComponent],
  providers: [provideGymCharts()],
  templateUrl: './progress-charts.component.html',
  styleUrl: './progress-charts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressChartsComponent {
  readonly sessions = input.required<WorkoutSession[]>();

  private readonly colors = readThemeColors(inject(DOCUMENT));

  protected readonly metric = signal<ProgressMetric>('weight');
  protected readonly metricCaption = computed(() => METRIC_CAPTION[this.metric()]);

  protected readonly exercises = computed(() => loggedExercises(this.sessions()));
  protected readonly exerciseOptions = computed<SelectOption<string>[]>(() =>
    this.exercises().map((e) => ({ value: e.id, label: e.name })),
  );
  /** Resets to the first logged exercise whenever the list changes and the old pick disappears. */
  protected readonly selectedExerciseId = linkedSignal<{ id: string }[], string | null>({
    source: this.exercises,
    computation: (list, previous) =>
      previous && list.some((e) => e.id === previous.value) ? previous.value : (list[0]?.id ?? null),
  });

  protected readonly volumeData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const weeks = weeklyVolume(this.sessions(), WEEKS);
    return {
      labels: weeks.map((w) => w.label),
      datasets: [
        {
          data: weeks.map((w) => Math.round(w.volume)),
          backgroundColor: weeks.map((w) => (w.isCurrent ? this.colors.pink : this.colors.lime)),
          borderRadius: BAR_RADIUS,
          borderSkipped: false,
          maxBarThickness: 28,
        },
      ],
    };
  });

  protected readonly progressPoints = computed(() => {
    const id = this.selectedExerciseId();
    return id ? exerciseProgress(this.sessions(), id, this.metric()) : [];
  });

  protected readonly progressData = computed<ChartConfiguration<'line'>['data']>(() => {
    const points = this.progressPoints();
    return {
      labels: points.map((p) => p.label),
      datasets: [jellyLineDataset(points.map((p) => p.value), this.colors.pink, this.colors.pink)],
    };
  });

  protected readonly barPlugins = [jellyGlowPlugin<'bar'>(withAlpha(this.colors.lime, 0.55)), jellyBarsPlugin(BAR_RADIUS)];
  protected readonly linePlugins = [jellyGlowPlugin<'line'>(withAlpha(this.colors.pink, 0.45), 12)];

  protected readonly barOptions: ChartConfiguration<'bar'>['options'] = chartOptions(this.colors);
  protected readonly lineOptions: ChartConfiguration<'line'>['options'] = chartOptions(this.colors);
}
