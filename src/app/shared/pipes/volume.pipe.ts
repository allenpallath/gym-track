import { Pipe, PipeTransform } from '@angular/core';

/** Kilograms → "820 kg" / "12.4 t". */
@Pipe({ name: 'volume' })
export class VolumePipe implements PipeTransform {
  transform(kg: number | null | undefined): string {
    const value = kg ?? 0;
    if (value >= 10_000) return `${(value / 1000).toFixed(1)} t`;
    return `${Math.round(value).toLocaleString()} kg`;
  }
}
