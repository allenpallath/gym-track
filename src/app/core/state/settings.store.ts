import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SettingsRepository } from '@core/data/repositories';
import { AppSettings, DEFAULT_SETTINGS } from '@shared/models';

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly repo = inject(SettingsRepository);

  private readonly _settings = signal<AppSettings>(DEFAULT_SETTINGS);
  private loadPromise: Promise<void> | null = null;

  /** Always populated: defaults until stored settings load. */
  readonly settings = this._settings.asReadonly();

  load(): Promise<void> {
    this.loadPromise ??= firstValueFrom(this.repo.get()).then((stored) => {
      // Merge so settings added in later versions get their defaults.
      if (stored) this._settings.set({ ...DEFAULT_SETTINGS, ...stored });
    });
    return this.loadPromise;
  }

  async update(patch: Partial<AppSettings>): Promise<void> {
    const next = { ...this._settings(), ...patch };
    this._settings.set(next);
    await firstValueFrom(this.repo.save(next));
  }
}
