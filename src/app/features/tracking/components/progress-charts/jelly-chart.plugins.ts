import { BarElement, Chart, ChartType, Plugin } from 'chart.js';

// Canvas versions of the CSS `jelly` surface (styles/_mixins.scss), since
// Chart.js draws on a canvas that CSS can't style.

/** Soft coloured halo under every dataset of the chart. */
export function jellyGlowPlugin<T extends ChartType>(color: string, blur = 16): Plugin<T> {
  return {
    id: 'jellyGlow',
    beforeDatasetDraw(chart: Chart<T>) {
      const ctx = chart.ctx;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
      ctx.shadowOffsetY = 6;
    },
    afterDatasetDraw(chart: Chart<T>) {
      chart.ctx.restore();
    },
  };
}

/** Gloss over each bar: bright top rim, light side rims, slightly deeper base. */
export function jellyBarsPlugin(radius: number): Plugin<'bar'> {
  return {
    id: 'jellyBars',
    afterDatasetDraw(chart, args) {
      const ctx = chart.ctx;
      for (const element of chart.getDatasetMeta(args.index).data as BarElement[]) {
        const { x, y, base, width } = element.getProps(['x', 'y', 'base', 'width'], true) as {
          x: number;
          y: number;
          base: number;
          width: number;
        };
        const height = base - y;
        if (height <= 2) continue;
        const left = x - width / 2;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(left, y, width, height, Math.min(radius, width / 2, height / 2));
        ctx.clip();

        const vertical = ctx.createLinearGradient(0, y, 0, base);
        vertical.addColorStop(0, 'rgba(255,255,255,0.6)');
        vertical.addColorStop(Math.min(0.3, 24 / height), 'rgba(255,255,255,0)');
        vertical.addColorStop(0.78, 'rgba(255,255,255,0)');
        vertical.addColorStop(1, 'rgba(0,0,0,0.1)');
        ctx.fillStyle = vertical;
        ctx.fillRect(left, y, width, height);

        const sides = ctx.createLinearGradient(left, 0, left + width, 0);
        sides.addColorStop(0, 'rgba(255,255,255,0.32)');
        sides.addColorStop(0.22, 'rgba(255,255,255,0)');
        sides.addColorStop(0.78, 'rgba(255,255,255,0)');
        sides.addColorStop(1, 'rgba(255,255,255,0.32)');
        ctx.fillStyle = sides;
        ctx.fillRect(left, y, width, height);
        ctx.restore();
      }
    },
  };
}

/** `#rrggbb` → `rgba(r,g,b,alpha)`. Falls back to the input for other formats. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16));
  return `rgba(${r},${g},${b},${alpha})`;
}
