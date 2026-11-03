import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { LucideAngularModule, ChevronRight, ListChecks, Play, Plus, Settings, Timer, Trophy } from 'lucide-angular';
import { ActiveSessionService } from '@core/state/active-session.service';
import { RoutineStore } from '@core/state/routine.store';
import { SessionLauncherService } from '@core/state/session-launcher.service';
import { SessionStore } from '@core/state/session.store';
import { BodyWeightStore } from '@core/state/body-weight.store';
import { SettingsStore } from '@core/state/settings.store';
import { daysSince, isWeighInDue } from '@core/training/weigh-in';
import { Routine } from '@shared/models';
import { ButtonComponent } from '@shared/components/button/button.component';
import { CardComponent } from '@shared/components/card/card.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { DurationPipe } from '@shared/pipes/duration.pipe';
import { VolumePipe } from '@shared/pipes/volume.pipe';
import { ExerciseImagePipe } from '@shared/pipes/exercise-image.pipe';
import { ImgFallbackDirective } from '@shared/directives/img-fallback.directive';
import { recentRecords } from '@features/tracking/tracking.utils';
import { TrainingBreakdownComponent } from './components/training-breakdown/training-breakdown.component';
import { WeightReminderComponent } from './components/weight-reminder/weight-reminder.component';

const RECENT_COUNT = 3;
const PR_DAYS = 7;

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    LucideAngularModule,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    DurationPipe,
    VolumePipe,
    ExerciseImagePipe,
    ImgFallbackDirective,
    TrainingBreakdownComponent,
    WeightReminderComponent,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly sessionStore = inject(SessionStore);
  private readonly routineStore = inject(RoutineStore);
  private readonly launcher = inject(SessionLauncherService);
  private readonly bodyWeightStore = inject(BodyWeightStore);
  private readonly settingsStore = inject(SettingsStore);
  protected readonly activeSession = inject(ActiveSessionService);

  protected readonly icons = { ChevronRight, ListChecks, Play, Plus, Settings, Timer, Trophy };

  protected readonly greeting = greetingFor(new Date());
  protected readonly today = new Date();

  protected readonly sessions = this.sessionStore.sessions;
  protected readonly routines = this.routineStore.routines;
  protected readonly routinesLoaded = this.routineStore.loaded;
  protected readonly recentSessions = computed(() => this.sessions().slice(0, RECENT_COUNT));
  protected readonly recentPrs = computed(() => recentRecords(this.sessions(), PR_DAYS, RECENT_COUNT));

  // ---- fortnightly weigh-in reminder ----
  protected readonly latestWeight = this.bodyWeightStore.latest;
  protected readonly daysSinceWeighIn = computed(() => {
    const latest = this.latestWeight();
    return latest ? daysSince(latest.date) : null;
  });
  protected readonly reminderOpen = signal(false);
  protected readonly savingWeight = signal(false);

  constructor() {
    void this.sessionStore.load();
    void this.routineStore.load();
    void this.checkWeighIn();
  }

  protected start(routine: Routine): void {
    void this.launcher.launch(routine);
  }

  protected async logWeight(kg: number): Promise<void> {
    this.savingWeight.set(true);
    try {
      await this.bodyWeightStore.log(kg);
      this.reminderOpen.set(false);
    } finally {
      this.savingWeight.set(false);
    }
  }

  protected snoozeWeighIn(): void {
    this.reminderOpen.set(false);
    void this.settingsStore.update({ weightReminderSnoozedAt: new Date().toISOString() });
  }

  private async checkWeighIn(): Promise<void> {
    await Promise.all([this.bodyWeightStore.load(), this.settingsStore.load(), this.sessionStore.load()]);
    // Brand-new users (nothing logged at all) aren't nagged on their first visit.
    const hasHistory = this.sessions().length > 0 || this.latestWeight() !== null;
    const due = isWeighInDue(this.latestWeight()?.date ?? null, this.settingsStore.settings().weightReminderSnoozedAt);
    this.reminderOpen.set(hasHistory && due);
  }
}

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return 'Late night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
