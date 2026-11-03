import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BodyWeightRepository } from '@core/data/repositories';
import { createId } from '@core/utils/id';
import { toDayKey } from '@core/utils/date.utils';
import { BodyWeightEntry } from '@shared/models';

@Injectable({ providedIn: 'root' })
export class BodyWeightStore {
  private readonly repo = inject(BodyWeightRepository);

  private readonly _entries = signal<BodyWeightEntry[]>([]);
  private readonly _loaded = signal(false);
  private loadPromise: Promise<void> | null = null;

  /** Oldest first (chart order). */
  readonly entries = this._entries.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly latest = computed(() => this._entries().at(-1) ?? null);

  load(): Promise<void> {
    this.loadPromise ??= firstValueFrom(this.repo.getAll()).then((list) => {
      this._entries.set(sortByDate(list));
      this._loaded.set(true);
    });
    return this.loadPromise;
  }

  /** Logs (or replaces) the weight for a day; defaults to today. */
  async log(kg: number, date: Date | string = new Date()): Promise<BodyWeightEntry> {
    const day = typeof date === 'string' ? date : toDayKey(date);
    const existing = this._entries().find((e) => e.date === day);
    const saved = await firstValueFrom(this.repo.save({ id: existing?.id ?? createId(), date: day, kg }));
    this._entries.update((list) => sortByDate([...list.filter((e) => e.date !== day), saved]));
    return saved;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.repo.delete(id));
    this._entries.update((list) => list.filter((e) => e.id !== id));
  }
}

function sortByDate(list: BodyWeightEntry[]): BodyWeightEntry[] {
  return [...list].sort((a, b) => a.date.localeCompare(b.date));
}
