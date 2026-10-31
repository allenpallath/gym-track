import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/** White jelly surface container. Content marked `cardHeader` is projected first. */
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
  readonly padding = input<CardPadding>('md');

  protected readonly hostClass = computed(() => `card-pad--${this.padding()}`);
}
