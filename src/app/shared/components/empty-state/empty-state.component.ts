import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideAngularModule, LucideIconData, Sparkles } from 'lucide-angular';

/** Friendly placeholder for empty lists. Put a call-to-action button inside as content. */
@Component({
  selector: 'app-empty-state',
  imports: [LucideAngularModule],
  template: `
    <div class="icon"><lucide-icon [img]="icon()" [size]="26" /></div>
    <h3 class="display-heading">{{ title() }}</h3>
    @if (message()) {
      <p class="caption">{{ message() }}</p>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 10px;
      padding: 40px 24px;
      border-radius: var(--gt-radius-xl);
      background: var(--gt-color-surface);
    }
    .icon {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 18px;
      background: var(--gt-color-lime-soft);
      color: var(--gt-color-lime-strong);
    }
    h3,
    p {
      margin: 0;
    }
    p {
      max-width: 280px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly icon = input<LucideIconData>(Sparkles);
}
