import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, ChevronRight, ListChecks, Play, Plus, Timer } from 'lucide-angular';
import { ActiveSessionService } from '@core/state/active-session.service';
import { RoutineStore } from '@core/state/routine.store';
import { SessionLauncherService } from '@core/state/session-launcher.service';
import { SessionStore } from '@core/state/session.store';
import { Routine } from '@shared/models';
import { ButtonComponent } from '@shared/components/button/button.component';
import { CardComponent } from '@shared/components/card/card.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { DurationPipe } from '@shared/pipes/duration.pipe';
import { VolumePipe } from '@shared/pipes/volume.pipe';
import { ExerciseImagePipe } from '@shared/pipes/exercise-image.pipe';
import { ImgFallbackDirective } from '@shared/directives/img-fallback.directive';
import { TrainingBreakdownComponent } from './components/training-breakdown/training-breakdown.component';

const RECENT_COUNT = 3;

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    DatePipe,
    LucideAngularModule,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    DurationPipe,
    VolumePipe,
    ExerciseImagePipe,
    ImgFallbackDirective,
    TrainingBreakdownComponent,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly sessionStore = inject(SessionStore);
  private readonly routineStore = inject(RoutineStore);
  private readonly launcher = inject(SessionLauncherService);
  protected readonly activeSession = inject(ActiveSessionService);

  protected readonly icons = { ChevronRight, ListChecks, Play, Plus, Timer };

  protected readonly greeting = greetingFor(new Date());
  protected readonly today = new Date();

  protected readonly sessions = this.sessionStore.sessions;
  protected readonly routines = this.routineStore.routines;
  protected readonly routinesLoaded = this.routineStore.loaded;
  protected readonly recentSessions = computed(() => this.sessions().slice(0, RECENT_COUNT));

  constructor() {
    void this.sessionStore.load();
    void this.routineStore.load();
  }

  protected start(routine: Routine): void {
    void this.launcher.launch(routine);
  }
}

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return 'Late night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
