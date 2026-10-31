import { Pipe, PipeTransform } from '@angular/core';

export type DurationFormat = 'clock' | 'short';

/**
 * Seconds → `clock` "1:05:09" / "05:09" (timers) or `short` "1h 05m" / "12m" (summaries).
 */
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(totalSec: number | null | undefined, format: DurationFormat = 'short'): string {
    const sec = Math.max(0, Math.floor(totalSec ?? 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');

    if (format === 'clock') {
      return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    }
    if (h > 0) return `${h}h ${pad(m)}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }
}
