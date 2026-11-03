import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  effect,
  inject,
  Injector,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, CalendarDays, Trophy } from 'lucide-angular';
import { SessionStore } from '@core/state/session.store';
import { BodyWeightStore } from '@core/state/body-weight.store';
import { addMonths, startOfMonth, toDayKey } from '@core/utils/date.utils';
import { WorkoutSession } from '@shared/models';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { CardComponent } from '@shared/components/card/card.component';
import { StatComponent } from '@shared/components/stat/stat.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ConfirmService } from '@shared/components/confirm-dialog/confirm.service';
import { DurationPipe } from '@shared/pipes/duration.pipe';
import { VolumePipe } from '@shared/pipes/volume.pipe';
import { MonthCalendarComponent } from '../components/month-calendar/month-calendar.component';
import { SessionCardComponent } from '../components/session-card/session-card.component';
import { ProgressChartsComponent } from '../components/progress-charts/progress-charts.component';
import { BodyWeightChartComponent } from '../components/body-weight-chart/body-weight-chart.component';

@Component({
  selector: 'app-history-page',
  imports: [
    RouterLink,
    LucideAngularModule,
    PageHeaderComponent,
    CardComponent,
    StatComponent,
    EmptyStateComponent,
    ButtonComponent,
    DurationPipe,
    VolumePipe,
    MonthCalendarComponent,
    SessionCardComponent,
    ProgressChartsComponent,
    BodyWeightChartComponent,
  ],
  templateUrl: './history.page.html',
  styleUrl: './history.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPage {
  private readonly store = inject(SessionStore);
  private readonly bodyWeight = inject(BodyWeightStore);
  private readonly confirm = inject(ConfirmService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  /** `?session=<id>` — focus a specific session (e.g. right after finishing a workout). */
  readonly session = input<string>();

  protected readonly calendarIcon = CalendarDays;
  protected readonly trophyIcon = Trophy;
  protected readonly loaded = this.store.loaded;
  protected readonly sessions = this.store.sessions;
  protected readonly bodyWeightEntries = this.bodyWeight.entries;
  protected readonly bodyWeightLoaded = this.bodyWeight.loaded;

  protected readonly viewMonth = signal(startOfMonth(new Date()));
  protected readonly selectedDay = signal<string | null>(null);
  protected readonly expandedId = signal<string | null>(null);
  private focusedSessionId: string | null = null;

  protected readonly dayCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const [key, list] of this.store.byDay()) counts.set(key, list.length);
    return counts;
  });

  protected readonly monthSessions = computed(() => {
    const month = this.viewMonth();
    return this.sessions().filter((s) => {
      const d = new Date(s.startedAt);
      return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
    });
  });

  protected readonly monthStats = computed(() => {
    let durationSec = 0;
    let volume = 0;
    let prs = 0;
    for (const s of this.monthSessions()) {
      durationSec += s.durationSec;
      volume += s.totalVolume;
      prs += s.prs?.length ?? 0;
    }
    return { count: this.monthSessions().length, durationSec, volume, prs };
  });

  protected readonly visibleSessions = computed<WorkoutSession[]>(() => {
    const day = this.selectedDay();
    return day ? (this.store.byDay().get(day) ?? []) : this.monthSessions();
  });

  protected readonly listTitle = computed(() => {
    const day = this.selectedDay();
    if (day) {
      const [y, m, d] = day.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    }
    return `${this.monthLabel()} sessions`;
  });

  protected readonly monthLabel = computed(() => this.viewMonth().toLocaleDateString(undefined, { month: 'long' }));

  constructor() {
    void this.store.load();
    void this.bodyWeight.load();

    // Once sessions are loaded, jump to the session passed in the query param (once per id).
    effect(() => {
      const id = this.session();
      if (!id || !this.loaded() || id === this.focusedSessionId) return;
      const target = this.sessions().find((s) => s.id === id);
      if (!target) return;

      this.focusedSessionId = id;
      const started = new Date(target.startedAt);
      this.viewMonth.set(startOfMonth(started));
      this.selectedDay.set(toDayKey(started));
      this.expandedId.set(id);
      afterNextRender(
        () => this.document.getElementById(`session-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        { injector: this.injector },
      );
    });
  }

  protected changeMonth(delta: -1 | 1): void {
    this.viewMonth.update((m) => addMonths(m, delta));
    this.selectedDay.set(null);
  }

  protected selectDay(key: string): void {
    this.selectedDay.update((current) => (current === key ? null : key));
    const [y, m] = key.split('-').map(Number);
    const month = this.viewMonth();
    if (month.getFullYear() !== y || month.getMonth() !== m - 1) this.viewMonth.set(new Date(y, m - 1, 1));
  }

  protected toggleSession(id: string): void {
    this.expandedId.update((current) => (current === id ? null : id));
  }

  protected async deleteSession(session: WorkoutSession): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete session?',
      message: `"${session.routineName}" will be removed from your history. This can't be undone.`,
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    await this.store.delete(session.id);
  }
}
