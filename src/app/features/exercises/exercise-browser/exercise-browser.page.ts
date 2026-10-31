import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Exercise } from '@shared/models';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ExerciseListComponent } from '@shared/components/exercise-list/exercise-list.component';

@Component({
  selector: 'app-exercise-browser-page',
  imports: [PageHeaderComponent, ExerciseListComponent],
  template: `
    <app-page-header title="Exercises" subtitle="Browse the library and learn proper form" />
    <app-exercise-list mode="browse" (selected)="open($event)" />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      max-width: 720px;
      margin: 0 auto;
      padding: 0 var(--gt-space-page);
      /* Leaves room for the floating bottom nav (nav height + its 12px inset + breathing room). */
      height: calc(100dvh - var(--gt-nav-height) - 24px - env(safe-area-inset-bottom));
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseBrowserPage {
  private readonly router = inject(Router);

  protected open(exercise: Exercise): void {
    void this.router.navigate(['/exercises', exercise.id]);
  }
}
