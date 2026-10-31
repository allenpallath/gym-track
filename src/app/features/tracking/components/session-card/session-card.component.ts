import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, ChevronDown, Trash2 } from 'lucide-angular';
import { WorkoutSession } from '@shared/models';
import { ButtonComponent } from '@shared/components/button/button.component';
import { DurationPipe } from '@shared/pipes/duration.pipe';
import { VolumePipe } from '@shared/pipes/volume.pipe';
import { ExerciseImagePipe } from '@shared/pipes/exercise-image.pipe';
import { ImgFallbackDirective } from '@shared/directives/img-fallback.directive';

/** Collapsible summary of one logged session; expanded view lists every set. */
@Component({
  selector: 'app-session-card',
  imports: [DatePipe, LucideAngularModule, ButtonComponent, DurationPipe, VolumePipe, ExerciseImagePipe, ImgFallbackDirective],
  templateUrl: './session-card.component.html',
  styleUrl: './session-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.expanded]': 'expanded()' },
})
export class SessionCardComponent {
  readonly session = input.required<WorkoutSession>();
  readonly expanded = input(false);

  readonly toggled = output<void>();
  readonly deleted = output<void>();

  protected readonly icons = { ChevronDown, Trash2 };
}
