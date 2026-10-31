import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowDown, ArrowUp, EllipsisVertical, Plus, Trash2 } from 'lucide-angular';
import { ExerciseEntry, WorkoutSet } from '@shared/models';
import { ButtonComponent } from '../button/button.component';
import { SetRowComponent, EntryMode } from '../set-row/set-row.component';
import { ExerciseImagePipe } from '../../pipes/exercise-image.pipe';
import { ImgFallbackDirective } from '../../directives/img-fallback.directive';

export interface SetChange {
  setId: string;
  patch: Partial<WorkoutSet>;
}

/** An exercise with its set rows. Used by the routine editor (`plan`) and live session (`log`). */
@Component({
  selector: 'app-exercise-entry-card',
  imports: [RouterLink, LucideAngularModule, ButtonComponent, SetRowComponent, ExerciseImagePipe, ImgFallbackDirective],
  templateUrl: './exercise-entry-card.component.html',
  styleUrl: './exercise-entry-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseEntryCardComponent {
  readonly entry = input.required<ExerciseEntry>();
  readonly mode = input<EntryMode>('plan');
  readonly isFirst = input(false);
  readonly isLast = input(false);

  readonly setChanged = output<SetChange>();
  readonly setAdded = output<void>();
  readonly setRemoved = output<string>();
  readonly moved = output<-1 | 1>();
  readonly removed = output<void>();

  protected readonly menuOpen = signal(false);
  protected readonly icons = { ArrowDown, ArrowUp, EllipsisVertical, Plus, Trash2 };

  protected move(direction: -1 | 1): void {
    this.menuOpen.set(false);
    this.moved.emit(direction);
  }

  protected remove(): void {
    this.menuOpen.set(false);
    this.removed.emit();
  }
}
