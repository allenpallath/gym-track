import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Exercise } from '@shared/models';
import { BottomSheetComponent } from '../bottom-sheet/bottom-sheet.component';
import { ExerciseListComponent } from '../exercise-list/exercise-list.component';

/**
 * Full-height sheet for adding exercises to a routine or a live session.
 *
 *   @if (pickerOpen()) {
 *     <app-exercise-picker [addedIds]="addedIds()" (added)="onAdd($event)" (closed)="pickerOpen.set(false)" />
 *   }
 */
@Component({
  selector: 'app-exercise-picker',
  imports: [BottomSheetComponent, ExerciseListComponent],
  template: `
    <app-bottom-sheet title="Add exercises" [fullHeight]="true" (closed)="closed.emit()">
      <app-exercise-list mode="pick" [addedIds]="addedIds()" (added)="added.emit($event)" />
    </app-bottom-sheet>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExercisePickerComponent {
  readonly addedIds = input<ReadonlySet<string>>(new Set());
  readonly added = output<Exercise>();
  readonly closed = output<void>();
}
