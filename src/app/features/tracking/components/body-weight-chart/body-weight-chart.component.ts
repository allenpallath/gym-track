import { ChangeDetectionStrategy, Component, computed, DOCUMENT, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { LucideAngularModule, Scale, TrendingDown, TrendingUp } from 'lucide-angular';
import { BodyWeightEntry } from '@shared/models';
import { ButtonComponent } from '@shared/components/button/button.component';
import { CardComponent } from '@shared/components/card/card.component';
import { bodyWeightSummary } from '../../tracking.utils';
import { jellyGlowPlugin, withAlpha } from '../progress-charts/jelly-chart.plugins';
import { chartOptions, jellyLineDataset, provideGymCharts, readThemeColors } from '../progress-charts/chart-theme';

const WINDOW_DAYS = 90;

/** Body-weight trend card. Only rendered inside `@defer`, so Chart.js stays lazy. */
@Component({
  selector: 'app-body-weight-chart',
  imports: [BaseChartDirective, DecimalPipe, RouterLink, LucideAngularModule, ButtonComponent, CardComponent],
  providers: [provideGymCharts()],
  templateUrl: './body-weight-chart.component.html',
  styleUrl: './body-weight-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BodyWeightChartComponent {
  /** Oldest first (BodyWeightStore order). */
  readonly entries = input.required<BodyWeightEntry[]>();

  private readonly colors = readThemeColors(inject(DOCUMENT));
  protected readonly icons = { Scale, TrendingDown, TrendingUp };
  protected readonly windowDays = WINDOW_DAYS;

  protected readonly summary = computed(() => bodyWeightSummary(this.entries(), WINDOW_DAYS));

  protected readonly chartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const points = this.summary().points;
    return {
      labels: points.map((p) => p.label),
      datasets: [jellyLineDataset(points.map((p) => p.value), this.colors.limeStrong, this.colors.lime)],
    };
  });

  protected readonly plugins = [jellyGlowPlugin<'line'>(withAlpha(this.colors.lime, 0.6), 12)];
  // Body weight never starts near zero, so let the axis fit the data.
  protected readonly options: ChartConfiguration<'line'>['options'] = chartOptions(this.colors, false);
}
