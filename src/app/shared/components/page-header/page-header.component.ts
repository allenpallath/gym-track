import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Location } from '@angular/common';
import { LucideAngularModule, ChevronLeft } from 'lucide-angular';
import { ButtonComponent } from '../button/button.component';

/**
 * Page title row: optional back button, uppercase display title, subtitle and
 * a right-hand actions slot (`<ng-container actions>` / any element with `actions`).
 */
@Component({
  selector: 'app-page-header',
  imports: [LucideAngularModule, ButtonComponent],
  template: `
    @if (back()) {
      <button appButton variant="outline" size="md" iconOnly aria-label="Go back" (click)="goBack()">
        <lucide-icon [img]="backIcon" [size]="20" />
      </button>
    }
    <div class="titles">
      <h1 class="display-heading--lg">{{ title() }}</h1>
      @if (subtitle()) {
        <p class="caption">{{ subtitle() }}</p>
      }
    </div>
    <div class="actions"><ng-content select="[actions]" /></div>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 0 16px;
    }
    .titles {
      flex: 1;
      min-width: 0;
    }
    h1 {
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    p {
      margin: 4px 0 0;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  private readonly location = inject(Location);

  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly back = input(false);

  protected readonly backIcon = ChevronLeft;

  protected goBack(): void {
    this.location.back();
  }
}
