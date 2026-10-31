import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ListChecks, Pencil, Play, Plus, Trash2, Zap } from 'lucide-angular';
import { RoutineStore } from '@core/state/routine.store';
import { SessionLauncherService } from '@core/state/session-launcher.service';
import { Routine } from '@shared/models';
import { ButtonComponent } from '@shared/components/button/button.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ExerciseImagePipe } from '@shared/pipes/exercise-image.pipe';
import { ImgFallbackDirective } from '@shared/directives/img-fallback.directive';
import { ConfirmService } from '@shared/components/confirm-dialog/confirm.service';
import { deleteRoutineDialog } from '../routine-dialogs';

interface RoutineCardVm {
  routine: Routine;
  exerciseCount: number;
  setCount: number;
  thumbs: string[];
}

@Component({
  selector: 'app-routine-list-page',
  imports: [
    DatePipe,
    RouterLink,
    LucideAngularModule,
    ButtonComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    ExerciseImagePipe,
    ImgFallbackDirective,
  ],
  templateUrl: './routine-list.page.html',
  styleUrl: './routine-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutineListPage {
  private readonly store = inject(RoutineStore);
  private readonly launcher = inject(SessionLauncherService);
  private readonly confirm = inject(ConfirmService);

  protected readonly icons = { ListChecks, Pencil, Play, Plus, Trash2, Zap };
  protected readonly loaded = this.store.loaded;

  protected readonly cards = computed<RoutineCardVm[]>(() =>
    this.store.routines().map((routine) => ({
      routine,
      exerciseCount: routine.exercises.length,
      setCount: routine.exercises.reduce((sum, e) => sum + e.sets.length, 0),
      thumbs: routine.exercises
        .slice(0, 3)
        .map((e) => e.image)
        .filter((img): img is string => !!img),
    })),
  );

  constructor() {
    void this.store.load();
  }

  protected start(routine: Routine): void {
    void this.launcher.launch(routine);
  }

  protected quickStart(): void {
    void this.launcher.launch(null);
  }

  protected async remove(routine: Routine): Promise<void> {
    if (await this.confirm.ask(deleteRoutineDialog(routine.name))) {
      await this.store.delete(routine.id);
    }
  }
}
