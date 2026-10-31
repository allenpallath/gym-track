import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Big display number + small unit + label, e.g. "3H 40M this week".
 * Sizes itself from its own width (container query), so a row of stats stays
 * on one line per value on phones. Lay several out with the global `.stat-row` class.
 */
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
      /* Scales with the stat's width so values like "12h 24m" never break mid-value. */
      /* 28cqi fits the longest values ("8,250 kg", "12h 24m") in a phone-width third. */
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
