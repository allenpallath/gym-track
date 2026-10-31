import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ExerciseRepository } from '@core/data/repositories';
import { Exercise, ExerciseFilters } from '@shared/models';

interface SearchRow {
  exercise: Exercise;
  /** Lower-cased name + muscles + equipment, built once for cheap substring search. */
  haystack: string;
}

@Injectable({ providedIn: 'root' })
export class ExerciseStore {
  private readonly repo = inject(ExerciseRepository);

  private readonly _exercises = signal<Exercise[]>([]);
  private readonly _status = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  private loadPromise: Promise<void> | null = null;

  readonly exercises = this._exercises.asReadonly();
  readonly status = this._status.asReadonly();
  readonly loading = computed(() => this._status() === 'loading' || this._status() === 'idle');

  readonly byId = computed(() => new Map(this._exercises().map((e) => [e.id, e])));

  private readonly searchRows = computed<SearchRow[]>(() =>
    this._exercises().map((exercise) => ({
      exercise,
      haystack: [exercise.name, ...exercise.primaryMuscles, ...exercise.secondaryMuscles, exercise.equipment ?? '']
        .join(' ')
        .toLowerCase(),
    })),
  );

  /** Idempotent: safe to call from every component that needs the catalogue. */
  load(): Promise<void> {
    this.loadPromise ??= this.fetch();
    return this.loadPromise;
  }

  /**
   * Pure filter over the cached catalogue. Call it inside a `computed()` so it
   * only re-runs when the filters (or the catalogue) change.
   */
  filter(filters: ExerciseFilters): Exercise[] {
    const terms = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const out: Exercise[] = [];
    for (const row of this.searchRows()) {
      const e = row.exercise;
      if (filters.muscle && !e.primaryMuscles.includes(filters.muscle)) continue;
      if (filters.equipment && e.equipment !== filters.equipment) continue;
      if (filters.level && e.level !== filters.level) continue;
      if (filters.category && e.category !== filters.category) continue;
      if (terms.length && !terms.every((t) => row.haystack.includes(t))) continue;
      out.push(e);
    }
    return out;
  }

  private async fetch(): Promise<void> {
    this._status.set('loading');
    try {
      const data = await firstValueFrom(this.repo.getAll());
      this._exercises.set([...data].sort((a, b) => a.name.localeCompare(b.name)));
      this._status.set('ready');
    } catch (err) {
      console.error('Failed to load exercises', err);
      this.loadPromise = null;
      this._status.set('error');
    }
  }
}
