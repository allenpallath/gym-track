import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Label + big display number + unit, e.g. "3H 40M this week". Group several with the `.stat-row` class. */
@Component({
  selector: 'app-stat',
  template: `
    <span class="label">{{ label() }}</span>
    <span class="value">
      <span class="display-number">{{ value() }}</span>
      @if (unit()) {
        <span class="unit">{{ unit() }}</span>
      }
    </span>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      container-type: inline-size;
    }
    .label {
      font-size: 0.8rem;
      color: var(--gt-color-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .value {
      display: flex;
      align-items: baseline;
      gap: 5px;
    }
    .display-number {
      /* Scales with the stat's width; 28cqi fits the longest values ("8,250 kg") in a phone-width third. */
      font-size: min(2rem, 28cqi);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .unit {
      font-size: 0.82rem;
      color: var(--gt-color-ink-soft);
      white-space: nowrap;
    }
    /* Narrow columns: unit sits under the number in every stat, so the row stays aligned. */
    @container (max-width: 150px) {
      .value {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly unit = input('');
}
