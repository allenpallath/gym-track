import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SessionRepository } from '@core/data/repositories';
import { toDayKey } from '@core/utils/date.utils';
import { WorkoutSession } from '@shared/models';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly repo = inject(SessionRepository);

  private readonly _sessions = signal<WorkoutSession[]>([]);
  private readonly _loaded = signal(false);
  private loadPromise: Promise<void> | null = null;

  /** Newest first. */
  readonly sessions = this._sessions.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  /** `YYYY-MM-DD` (local) → sessions that started that day. Drives the calendar. */
  readonly byDay = computed(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const s of this._sessions()) {
      const key = toDayKey(s.startedAt);
      const bucket = map.get(key);
      if (bucket) bucket.push(s);
      else map.set(key, [s]);
    }
    return map;
  });

  load(): Promise<void> {
    this.loadPromise ??= firstValueFrom(this.repo.getAll()).then((list) => {
      this._sessions.set(list);
      this._loaded.set(true);
    });
    return this.loadPromise;
  }

  async save(session: WorkoutSession): Promise<WorkoutSession> {
    const saved = await firstValueFrom(this.repo.save(session));
    this._sessions.update((list) =>
      [saved, ...list.filter((s) => s.id !== saved.id)].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    );
    return saved;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.repo.delete(id));
    this._sessions.update((list) => list.filter((s) => s.id !== id));
  }
}
