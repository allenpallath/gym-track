import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Big display number + small unit + label, e.g. "3H 40M this week". Matches the design's stat row. */
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
    }
    .label {
      font-size: 0.8rem;
      color: var(--gt-color-muted);
    }
    .value {
      display: flex;
      align-items: baseline;
      gap: 5px;
    }
    .unit {
      font-size: 0.82rem;
      color: var(--gt-color-ink-soft);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly unit = input('');
}
