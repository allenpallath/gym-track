import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ChipTone = 'neutral' | 'pink' | 'lime';

/**
 * Pill used for filters (`<button appChip [selected]="...">`) and static tags
 * (`<span appChip tone="pink">chest</span>`).
 */
@Component({
  selector: 'button[appChip], span[appChip]',
  template: '<ng-content />',
  styleUrl: './chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"chip chip--" + tone()',
    '[class.chip--selected]': 'selected()',
    '[class.chip--small]': 'small()',
    '[attr.aria-pressed]': 'selected() ? "true" : null',
  },
})
export class ChipComponent {
  readonly selected = input(false, { transform: booleanAttribute });
  readonly tone = input<ChipTone>('neutral');
  readonly small = input(false, { transform: booleanAttribute });
}
