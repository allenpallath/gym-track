import { ChangeDetectionStrategy, Component, computed, DOCUMENT, inject, input, linkedSignal } from '@angular/core';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
import {
  BarController,
  BarElement,
  CategoryScale,
  ChartConfiguration,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { WorkoutSession } from '@shared/models';
import { CardComponent } from '@shared/components/card/card.component';
import { SelectComponent, SelectOption } from '@shared/components/select/select.component';
import { exerciseProgress, loggedExercises, weeklyVolume } from '../../tracking.utils';
import { jellyBarsPlugin, jellyGlowPlugin, withAlpha } from './jelly-chart.plugins';

const WEEKS = 8;
const BAR_RADIUS = 10;

/**
 * Chart.js is registered here (not app-wide) and this component is only
 * rendered inside `@defer`, so the charting code ships in a lazy chunk.
 */
@Component({
  selector: 'app-progress-charts',
  imports: [BaseChartDirective, CardComponent, SelectComponent],
  providers: [
    provideCharts({
      registerables: [
        BarController,
        BarElement,
        LineController,
        LineElement,
        PointElement,
        CategoryScale,
        LinearScale,
        Tooltip,
        Filler,
      ],
    }),
  ],
  templateUrl: './progress-charts.component.html',
  styleUrl: './progress-charts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressChartsComponent {
  readonly sessions = input.required<WorkoutSession[]>();

  private readonly colors = readThemeColors(inject(DOCUMENT));

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
    return id ? exerciseProgress(this.sessions(), id) : [];
  });

  protected readonly progressData = computed<ChartConfiguration<'line'>['data']>(() => {
    const points = this.progressPoints();
    return {
      labels: points.map((p) => p.label),
      datasets: [
        {
          data: points.map((p) => p.weight),
          borderColor: this.colors.pink,
          borderWidth: 3,
          // Pink wash that fades out towards the axis.
          backgroundColor: ({ chart }) => {
            const area = chart.chartArea;
            if (!area) return this.colors.pinkSoft;
            const gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
            gradient.addColorStop(0, withAlpha(this.colors.pink, 0.35));
            gradient.addColorStop(1, withAlpha(this.colors.pink, 0));
            return gradient;
          },
          pointBackgroundColor: '#fff',
          pointBorderColor: this.colors.pink,
          pointBorderWidth: 3,
          pointRadius: 4,
          tension: 0.35,
          fill: true,
        },
      ],
    };
  });

  protected readonly barPlugins = [jellyGlowPlugin<'bar'>(withAlpha(this.colors.lime, 0.55)), jellyBarsPlugin(BAR_RADIUS)];
  protected readonly linePlugins = [jellyGlowPlugin<'line'>(withAlpha(this.colors.pink, 0.45), 12)];

  protected readonly barOptions: ChartConfiguration<'bar'>['options'] = this.baseOptions();
  protected readonly lineOptions: ChartConfiguration<'line'>['options'] = this.baseOptions();

  private baseOptions() {
    const { muted, line } = this.colors;
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx: { parsed: { y: number | null } }) => `${ctx.parsed.y ?? 0} kg` } },
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: muted, font: { size: 11 } } },
        y: {
          beginAtZero: true,
          grid: { color: line },
          border: { display: false },
          ticks: { color: muted, font: { size: 11 }, maxTicksLimit: 5 },
        },
      },
    };
  }
}

function readThemeColors(doc: Document) {
  const style = getComputedStyle(doc.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    pink: read('--gt-color-pink', '#e27ad6'),
    pinkSoft: read('--gt-color-pink-soft', '#fbe6f8'),
    lime: read('--gt-color-lime', '#c9e85f'),
    muted: read('--gt-color-muted', '#77787c'),
    line: read('--gt-color-line', '#e4e4e7'),
  };
}
