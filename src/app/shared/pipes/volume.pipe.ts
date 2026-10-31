import { Pipe, PipeTransform } from '@angular/core';

export type VolumePart = 'full' | 'value' | 'unit';

/** Volume = Σ weight × reps. Below 10,000 kg it's shown in kg, above in tonnes (1 tonne = 1,000 kg). */
export function formatVolume(kg: number | null | undefined): { value: string; unit: 'kg' | 'tonnes' } {
  const v = kg ?? 0;
  return v >= 10_000
    ? { value: (v / 1000).toFixed(1), unit: 'tonnes' }
    : { value: Math.round(v).toLocaleString(), unit: 'kg' };
}

/**
 * `{{ 820 | volume }}` → "820 kg", `{{ 12600 | volume }}` → "12.6 tonnes".
 * For stat tiles split it: `[value]="v | volume:'value'"` + `[unit]="v | volume:'unit'"`.
 */
@Pipe({ name: 'volume' })
export class VolumePipe implements PipeTransform {
  transform(kg: number | null | undefined, part: VolumePart = 'full'): string {
    const { value, unit } = formatVolume(kg);
    if (part === 'value') return value;
    if (part === 'unit') return unit;
    return `${value} ${unit}`;
  }
}
