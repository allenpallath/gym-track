import { ChangeDetectionStrategy, Component, DOCUMENT, effect, inject } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { LucideAngularModule, CircleQuestionMark, TriangleAlert } from 'lucide-angular';
import { ButtonComponent } from '../button/button.component';
import { ConfirmService } from './confirm.service';

/** Renders the request held by ConfirmService. Mount once, in the app shell. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [A11yModule, LucideAngularModule, ButtonComponent],
  template: `
    @if (confirm.current(); as req) {
      <div class="backdrop" animate.enter="fade-in" animate.leave="fade-out" (click)="confirm.settle(false)"></div>
      <section
        class="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        [attr.aria-describedby]="req.message ? 'confirm-message' : null"
        [class.dialog--danger]="req.tone === 'danger'"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        animate.enter="dialog-in"
        animate.leave="dialog-out"
      >
        <span class="badge">
          <lucide-icon [img]="req.tone === 'danger' ? icons.TriangleAlert : icons.CircleQuestionMark" [size]="24" />
        </span>
        <h2 id="confirm-title" class="display-heading">{{ req.title }}</h2>
        @if (req.message) {
          <p id="confirm-message" class="caption">{{ req.message }}</p>
        }
        <div class="actions">
          <!-- Destructive dialogs focus Cancel first so a stray Enter is harmless. -->
          <button
            appButton
            variant="outline"
            size="lg"
            type="button"
            [attr.cdkFocusInitial]="req.tone === 'danger' ? '' : null"
            (click)="confirm.settle(false)"
          >
            {{ req.cancelText }}
          </button>
          <button
            appButton
            size="lg"
            type="button"
            [variant]="req.tone === 'danger' ? 'pink' : 'accent'"
            [attr.cdkFocusInitial]="req.tone === 'danger' ? null : ''"
            (click)="confirm.settle(true)"
          >
            {{ req.confirmText }}
          </button>
        </div>
      </section>
    }
  `,
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);
  protected readonly icons = { CircleQuestionMark, TriangleAlert };

  constructor() {
    // Lock page scroll while a dialog is open.
    const body = inject(DOCUMENT).body;
    effect((onCleanup) => {
      if (!this.confirm.current()) return;
      const previous = body.style.overflow;
      body.style.overflow = 'hidden';
      onCleanup(() => (body.style.overflow = previous));
    });
  }

  protected onEscape(): void {
    if (this.confirm.current()) this.confirm.settle(false);
  }
}
