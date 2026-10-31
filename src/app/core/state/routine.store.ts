import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RoutineRepository } from '@core/data/repositories';
import { createId } from '@core/utils/id';
import { ExerciseEntry, Routine } from '@shared/models';

@Injectable({ providedIn: 'root' })
export class RoutineStore {
  private readonly repo = inject(RoutineRepository);

  private readonly _routines = signal<Routine[]>([]);
  private readonly _loaded = signal(false);
  private loadPromise: Promise<void> | null = null;

  readonly routines = this._routines.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly byId = computed(() => new Map(this._routines().map((r) => [r.id, r])));

  load(): Promise<void> {
    this.loadPromise ??= firstValueFrom(this.repo.getAll()).then((list) => {
      this._routines.set(list);
      this._loaded.set(true);
    });
    return this.loadPromise;
  }

  createDraft(name = '', exercises: ExerciseEntry[] = []): Routine {
    const now = new Date().toISOString();
    return { id: createId(), name, notes: '', exercises, createdAt: now, updatedAt: now, lastPerformedAt: null };
  }

  async save(routine: Routine): Promise<Routine> {
    const toSave: Routine = { ...routine, updatedAt: new Date().toISOString() };
    const saved = await firstValueFrom(this.repo.save(toSave));
    this._routines.update((list) => [saved, ...list.filter((r) => r.id !== saved.id)]);
    return saved;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.repo.delete(id));
    this._routines.update((list) => list.filter((r) => r.id !== id));
  }

  async markPerformed(id: string, at: string): Promise<void> {
    const routine = this.byId().get(id);
    if (!routine) return;
    const saved = await firstValueFrom(this.repo.save({ ...routine, lastPerformedAt: at }));
    this._routines.update((list) => list.map((r) => (r.id === id ? saved : r)));
  }
}
