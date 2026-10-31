import { ChangeDetectionStrategy, Component, DOCUMENT, effect, inject, input, output } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';
import { ButtonComponent } from '../button/button.component';

/**
 * Mobile slide-up sheet. Render it conditionally from the parent:
 *
 *   @if (pickerOpen()) {
 *     <app-bottom-sheet title="Add exercise" (closed)="pickerOpen.set(false)"> ... </app-bottom-sheet>
 *   }
 *
 * `fullHeight` makes the body a flex column filling the viewport (needed for virtual scroll).
 */
@Component({
  selector: 'app-bottom-sheet',
  imports: [LucideAngularModule, ButtonComponent],
  template: `
    <div class="backdrop" animate.enter="fade-in" animate.leave="fade-out" (click)="closed.emit()"></div>
    <section
      class="sheet"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title()"
      [class.sheet--full]="fullHeight()"
      animate.enter="slide-up-in"
      animate.leave="slide-up-out"
    >
      <header class="sheet-header">
        <h2 class="display-heading">{{ title() }}</h2>
        <button appButton variant="ghost" iconOnly aria-label="Close" (click)="closed.emit()">
          <lucide-icon [img]="closeIcon" [size]="22" />
        </button>
      </header>
      <div class="sheet-body"><ng-content /></div>
    </section>
  `,
  styleUrl: './bottom-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class BottomSheetComponent {
  readonly title = input('');
  readonly fullHeight = input(false);
  readonly closed = output<void>();

  protected readonly closeIcon = X;

  constructor() {
    // Lock page scroll behind the sheet while it is mounted.
    const body = inject(DOCUMENT).body;
    effect((onCleanup) => {
      const previous = body.style.overflow;
      body.style.overflow = 'hidden';
      onCleanup(() => (body.style.overflow = previous));
    });
  }
}
