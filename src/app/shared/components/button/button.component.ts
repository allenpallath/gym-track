import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** `pink` doubles as the destructive style (discard, delete). */
export type ButtonVariant = 'primary' | 'accent' | 'pink' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Attribute component so native semantics (type, disabled, routerLink, a11y)
 * are kept: `<button appButton variant="accent">Save</button>`,
 * `<a appButton routerLink="/x">Go</a>`. Icons go in as content.
 */
@Component({
  selector: 'button[appButton], a[appButton]',
  template: '<ng-content />',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass()',
  },
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly block = input(false, { transform: booleanAttribute });
  /** Square/circular button that only contains an icon. Remember an aria-label. */
  readonly iconOnly = input(false, { transform: booleanAttribute });

  protected readonly hostClass = computed(() => {
    const classes = ['gt-btn', `gt-btn--${this.variant()}`, `gt-btn--${this.size()}`];
    if (this.block()) classes.push('gt-btn--block');
    if (this.iconOnly()) classes.push('gt-btn--icon');
    return classes.join(' ');
  });
}
