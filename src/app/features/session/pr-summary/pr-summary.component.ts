import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LucideAngularModule, Trophy } from 'lucide-angular';
import { PersonalRecord } from '@shared/models';
import { BottomSheetComponent } from '@shared/components/bottom-sheet/bottom-sheet.component';
import { ButtonComponent } from '@shared/components/button/button.component';

/** Celebration shown after finishing a workout that set personal records. */
@Component({
  selector: 'app-pr-summary',
  imports: [DecimalPipe, LucideAngularModule, BottomSheetComponent, ButtonComponent],
  template: `
    <app-bottom-sheet title="New records!" (closed)="done.emit()">
      <div class="hero">
        <span class="trophy"><lucide-icon [img]="icons.Trophy" [size]="30" /></span>
        <p class="caption">
          You beat {{ prs().length }} personal {{ prs().length === 1 ? 'record' : 'records' }} this workout.
        </p>
      </div>
      <ul class="list">
        @for (pr of prs(); track pr.exerciseId + pr.kind) {
          <li class="pr" [class.pr--e1rm]="pr.kind === 'e1rm'">
            <span class="kind">{{ pr.kind === 'weight' ? 'Heaviest set' : 'Est. 1RM' }}</span>
            <strong class="name">{{ pr.exerciseName }}</strong>
            <span class="value">
              <span class="display-number">{{ pr.value | number: '1.0-1' }}</span> kg
              <span class="was">was {{ pr.previous | number: '1.0-1' }}</span>
            </span>
          </li>
        }
      </ul>
      <button appButton variant="accent" size="lg" block type="button" class="done" (click)="done.emit()">Done</button>
    </app-bottom-sheet>
  `,
  styleUrl: './pr-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrSummaryComponent {
  readonly prs = input.required<PersonalRecord[]>();
  readonly done = output<void>();
  protected readonly icons = { Trophy };
}
