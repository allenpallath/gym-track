import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type CardVariant = 'surface' | 'muted' | 'lime';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/** Rounded surface container. Content marked `cardHeader` is projected first. */
@Component({
  selector: 'app-card',
  template: `
    <ng-content select="[cardHeader]" />
    <ng-content />
  `,
  styleUrl: './card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClass()' },
})
export class CardComponent {
  readonly variant = input<CardVariant>('surface');
  readonly padding = input<CardPadding>('md');

  protected readonly hostClass = computed(() => `card--${this.variant()} card-pad--${this.padding()}`);
}
