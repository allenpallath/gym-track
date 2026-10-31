import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { createId } from '@core/utils/id';

/** Labelled text input / textarea with two-way binding: `<app-text-field label="Name" [(value)]="name" />` */
@Component({
  selector: 'app-text-field',
  template: `
    @if (label()) {
      <label class="label" [for]="inputId">{{ label() }}</label>
    }
    @if (multiline()) {
      <textarea
        class="field-input textarea"
        [id]="inputId"
        [value]="value()"
        [placeholder]="placeholder()"
        [attr.maxlength]="maxLength()"
        rows="3"
        (input)="value.set($any($event.target).value)"
      ></textarea>
    } @else {
      <input
        class="field-input"
        type="text"
        [id]="inputId"
        [value]="value()"
        [placeholder]="placeholder()"
        [attr.maxlength]="maxLength()"
        enterkeyhint="done"
        (input)="value.set($any($event.target).value)"
      />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .label {
      display: block;
      margin-bottom: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--gt-color-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .textarea {
      height: auto;
      padding: 12px 14px;
      resize: vertical;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextFieldComponent {
  readonly value = model('');
  readonly label = input('');
  readonly placeholder = input('');
  readonly multiline = input(false);
  readonly maxLength = input<number | null>(null);

  protected readonly inputId = `tf-${createId()}`;
}
