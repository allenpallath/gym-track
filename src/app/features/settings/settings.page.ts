import { ChangeDetectionStrategy, Component, computed, DOCUMENT, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, Download, Trash2, Upload } from 'lucide-angular';
import { BodyWeightStore } from '@core/state/body-weight.store';
import { ExerciseStore } from '@core/state/exercise.store';
import { SessionStore } from '@core/state/session.store';
import { SettingsStore } from '@core/state/settings.store';
import { createId } from '@core/utils/id';
import { toDayKey } from '@core/utils/date.utils';
import { computeTotals } from '@core/utils/workout.utils';
import { BodyWeightEntry, Exercise, ExerciseEntry, WorkoutSession } from '@shared/models';
import { ButtonComponent } from '@shared/components/button/button.component';
import { CardComponent } from '@shared/components/card/card.component';
import { ChipComponent } from '@shared/components/chip/chip.component';
import { ConfirmService } from '@shared/components/confirm-dialog/confirm.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatComponent } from '@shared/components/stat/stat.component';
import { ImportedExercise, parseWorkoutCsv, sessionsToCsv } from './csv';

const REST_OPTIONS = [60, 90, 120, 180];
const BAR_OPTIONS = [20, 15, 10];
const PLATE_OPTIONS = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];
const RECENT_WEIGHTS = 10;

interface ImportPreview {
  fileName: string;
  sessions: WorkoutSession[];
  sets: number;
  duplicates: number;
  unmatched: string[];
}

@Component({
  selector: 'app-settings-page',
  imports: [DatePipe, LucideAngularModule, ButtonComponent, CardComponent, ChipComponent, PageHeaderComponent, StatComponent],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage implements OnInit {
  private readonly settingsStore = inject(SettingsStore);
  private readonly bodyWeight = inject(BodyWeightStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly exerciseStore = inject(ExerciseStore);
  private readonly confirm = inject(ConfirmService);
  private readonly document = inject(DOCUMENT);

  protected readonly icons = { Download, Trash2, Upload };
  protected readonly restOptions = REST_OPTIONS;
  protected readonly barOptions = BAR_OPTIONS;
  protected readonly plateOptions = PLATE_OPTIONS;

  protected readonly settings = this.settingsStore.settings;
  protected readonly latestWeight = this.bodyWeight.latest;

  // ---- body weight ----
  protected readonly weightInput = signal('');
  protected readonly showAllWeights = signal(false);
  protected readonly weightCount = computed(() => this.bodyWeight.entries().length);
  protected readonly weightRows = computed(() => {
    const newestFirst = [...this.bodyWeight.entries()].reverse();
    return this.showAllWeights() ? newestFirst : newestFirst.slice(0, RECENT_WEIGHTS);
  });
  protected readonly weightValid = computed(() => parseKg(this.weightInput()) !== null);

  // ---- rest timer / plates ----
  protected readonly isCustomRest = computed(() => !REST_OPTIONS.includes(this.settings().restSec));
  protected readonly plateSet = computed(() => new Set(this.settings().platesKg));
  protected readonly notificationNote = signal(notificationBlockedNote(notificationPermission()));
  /** The stored default is "on", but the switch must not claim notifications the browser blocks. */
  protected readonly notificationsOn = computed(
    () => this.settings().restNotifications && !notificationBlockedNote(notificationPermission()),
  );

  // ---- data ----
  protected readonly exportNote = signal('');
  protected readonly importNote = signal('');
  protected readonly importing = signal(false);
  protected readonly preview = signal<ImportPreview | null>(null);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.settingsStore.load(), this.bodyWeight.load()]);
  }

  // ---------- body weight ----------

  protected async logWeight(): Promise<void> {
    const kg = parseKg(this.weightInput());
    if (kg === null) return;
    await this.bodyWeight.log(kg);
    this.weightInput.set('');
  }

  protected async deleteWeight(entry: BodyWeightEntry): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete entry?',
      message: `${entry.kg} kg on ${entry.date} will be removed.`,
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (ok) await this.bodyWeight.delete(entry.id);
  }

  // ---------- preferences ----------

  protected setRest(sec: number): void {
    if (sec > 0) void this.settingsStore.update({ restSec: Math.round(sec) });
  }

  protected setCustomRest(event: Event): void {
    const sec = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(sec) && sec >= 10 && sec <= 900) this.setRest(sec);
  }

  protected async toggleNotifications(): Promise<void> {
    this.notificationNote.set('');
    if (this.notificationsOn()) {
      await this.settingsStore.update({ restNotifications: false });
      return;
    }
    const current = notificationPermission();
    const permission = current === 'default' ? await Notification.requestPermission() : current;
    const blocked = notificationBlockedNote(permission);
    if (blocked) {
      this.notificationNote.set(blocked);
      return;
    }
    await this.settingsStore.update({ restNotifications: true });
  }

  protected setBar(kg: number): void {
    if (kg >= 0) void this.settingsStore.update({ barKg: kg });
  }

  protected togglePlate(kg: number): void {
    const current = this.settings().platesKg;
    const next = current.includes(kg) ? current.filter((p) => p !== kg) : [...current, kg];
    void this.settingsStore.update({ platesKg: next.sort((a, b) => b - a) });
  }

  // ---------- export ----------

  protected async exportCsv(): Promise<void> {
    await this.sessionStore.load();
    const sessions = this.sessionStore.sessions();
    if (!sessions.length) {
      this.exportNote.set('No workouts to export yet.');
      return;
    }
    const blob = new Blob([sessionsToCsv(sessions)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = `gymtrack-export-${toDayKey(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.exportNote.set(`Exported ${sessions.length} workouts.`);
  }

  // ---------- import ----------

  protected async onFileChosen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow choosing the same file again
    if (!file) return;

    this.importNote.set('');
    this.preview.set(null);
    try {
      const { workouts } = parseWorkoutCsv(await file.text());
      await Promise.all([this.exerciseStore.load(), this.sessionStore.load()]);

      const resolve = this.exerciseResolver();
      const unmatched = new Set<string>();
      const existing = new Set(this.sessionStore.sessions().map((s) => `${s.startedAt}|${s.routineName}`));
      let duplicates = 0;
      let sets = 0;

      const sessions: WorkoutSession[] = [];
      for (const w of workouts) {
        if (existing.has(`${w.startedAt}|${w.name}`)) {
          duplicates++;
          continue;
        }
        const exercises = w.exercises.map((ex) => {
          const entry = toEntry(ex, resolve(ex));
          if (!resolve(ex)) unmatched.add(ex.name);
          sets += entry.sets.length;
          return entry;
        });
        const totals = computeTotals(exercises, true);
        sessions.push({
          id: createId(),
          routineId: null,
          routineName: w.name,
          startedAt: w.startedAt,
          endedAt: w.endedAt,
          durationSec: w.durationSec,
          exercises,
          totalVolume: totals.volume,
          totalSets: totals.sets,
          totalReps: totals.reps,
        });
      }

      if (!sessions.length) {
        this.importNote.set(duplicates ? 'Every workout in this file is already in your history.' : 'No workouts found in this file.');
        return;
      }
      this.preview.set({ fileName: file.name, sessions, sets, duplicates, unmatched: [...unmatched].sort() });
    } catch (err) {
      this.importNote.set(err instanceof Error ? err.message : "Couldn't read this file.");
    }
  }

  protected cancelImport(): void {
    this.preview.set(null);
  }

  protected async confirmImport(): Promise<void> {
    const preview = this.preview();
    if (!preview || this.importing()) return;
    const n = preview.sessions.length;
    const ok = await this.confirm.ask({
      title: `Import ${n} workout${n === 1 ? '' : 's'}?`,
      message: `${preview.sets} sets will be added to your history.`,
      confirmText: 'Import',
    });
    if (!ok) return;

    this.importing.set(true);
    try {
      for (const session of preview.sessions) await this.sessionStore.save(session);
      this.importNote.set(`Imported ${n} workout${n === 1 ? '' : 's'}.`);
      this.preview.set(null);
    } finally {
      this.importing.set(false);
    }
  }

  /** Our own export carries ids; otherwise match by exact name, then by search. */
  private exerciseResolver(): (ex: ImportedExercise) => Exercise | null {
    const byId = this.exerciseStore.byId();
    const byName = new Map([...byId.values()].map((e) => [e.name.toLowerCase(), e]));
    const cache = new Map<string, Exercise | null>();
    return (ex) => {
      if (ex.exerciseId && byId.has(ex.exerciseId)) return byId.get(ex.exerciseId)!;
      const key = ex.name.toLowerCase();
      if (!cache.has(key)) {
        const exact = byName.get(key);
        // Strong/Hevy names carry equipment in brackets, e.g. "Bench Press (Barbell)".
        const query = ex.name.replace(/[()[\],]/g, ' ').trim();
        const found = exact ?? (query ? this.exerciseStore.search({ query, muscle: null, equipment: null, level: null }).items[0] : undefined);
        cache.set(key, found ?? null);
      }
      return cache.get(key)!;
    };
  }
}

function toEntry(ex: ImportedExercise, match: Exercise | null): ExerciseEntry {
  return {
    id: createId(),
    exerciseId: match?.id ?? ex.exerciseId ?? `custom-${slug(ex.name)}`,
    exerciseName: match?.name ?? ex.name,
    image: match?.images[0] ?? null,
    sets: ex.sets.map((s) => ({ id: createId(), weight: s.weight, reps: s.reps, completed: true, ...(s.warmup ? { warmup: true } : {}) })),
  };
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'exercise';
}

function parseKg(value: string): number | null {
  const n = Number(value.trim().replace(',', '.'));
  return value.trim() !== '' && Number.isFinite(n) && n > 0 && n < 500 ? Math.round(n * 100) / 100 : null;
}

function notificationPermission(): NotificationPermission | 'unsupported' {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

/** Explanation when notifications can't be used, or '' when they can (or can still be asked for). */
function notificationBlockedNote(permission: NotificationPermission | 'unsupported'): string {
  if (permission === 'unsupported') return "This browser doesn't support notifications.";
  if (permission === 'denied') return 'Notifications are blocked. Allow them for this site in your browser settings.';
  return '';
}
