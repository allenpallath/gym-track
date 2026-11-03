import { Provider } from '@angular/core';
import { provideCharts } from 'ng2-charts';
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
import { withAlpha } from './jelly-chart.plugins';

/**
 * Registers only the Chart.js pieces we use. Provided per chart component (never
 * app-wide) and those components only render inside `@defer`, so Chart.js stays lazy.
 */
export function provideGymCharts(): Provider {
  return provideCharts({
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
  });
}

export type ThemeColors = ReturnType<typeof readThemeColors>;

/** Chart colours from the CSS tokens, so charts follow the active theme. */
export function readThemeColors(doc: Document) {
  const style = getComputedStyle(doc.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    pink: read('--gt-color-pink', '#e27ad6'),
    pinkSoft: read('--gt-color-pink-soft', '#fbe6f8'),
    lime: read('--gt-color-lime', '#c9e85f'),
    limeStrong: read('--gt-color-lime-strong', '#6f8f12'),
    muted: read('--gt-color-muted', '#77787c'),
    line: read('--gt-color-line', '#e4e4e7'),
  };
}

export function chartOptions(colors: ThemeColors, beginAtZero = true) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: { parsed: { y: number | null } }) => `${ctx.parsed.y ?? 0} kg` } },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: colors.muted, font: { size: 11 } } },
      y: {
        beginAtZero,
        grid: { color: colors.line },
        border: { display: false },
        ticks: { color: colors.muted, font: { size: 11 }, maxTicksLimit: 5 },
      },
    },
  };
}

/** Line dataset with the jelly look: thick line, white-centred points, a wash fading to the axis. */
export function jellyLineDataset(
  values: number[],
  line: string,
  wash: string,
): ChartConfiguration<'line'>['data']['datasets'][number] {
  return {
    data: values,
    borderColor: line,
    borderWidth: 3,
    backgroundColor: ({ chart }) => {
      const area = chart.chartArea;
      if (!area) return withAlpha(wash, 0.2);
      const gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
      gradient.addColorStop(0, withAlpha(wash, 0.35));
      gradient.addColorStop(1, withAlpha(wash, 0));
      return gradient;
    },
    pointBackgroundColor: '#fff',
    pointBorderColor: line,
    pointBorderWidth: 3,
    pointRadius: 4,
    tension: 0.35,
    fill: true,
  };
}
