import { booleanAttribute, ChangeDetectionStrategy, Component, ElementRef, input, model, viewChild } from '@angular/core';
import { LucideAngularModule, Search, X } from 'lucide-angular';

/**
 * Jelly search box with icon and clear button.
 *
 *   <app-search-field placeholder="Search exercises" ariaLabel="Search exercises" [(value)]="query" />
 *
 * Debouncing is left to the consumer. When the field drives a listbox (e.g. the
 * select panel) pass `ariaControls` / `ariaActiveDescendant` to expose it as a combobox.
 */
@Component({
  selector: 'app-search-field',
  imports: [LucideAngularModule],
  template: `
    <lucide-icon class="icon" [img]="icons.Search" [size]="compact() ? 16 : 18" />
    <input
      #field
      class="input"
      type="search"
      enterkeyhint="search"
      autocomplete="off"
      [value]="value()"
      [placeholder]="placeholder()"
      [attr.aria-label]="ariaLabel() || placeholder()"
      [attr.role]="ariaControls() ? 'combobox' : null"
      [attr.aria-autocomplete]="ariaControls() ? 'list' : null"
      [attr.aria-controls]="ariaControls()"
      [attr.aria-activedescendant]="ariaActiveDescendant()"
      (input)="value.set(field.value)"
    />
    @if (value()) {
      <button class="clear" type="button" aria-label="Clear search" (click)="clear()">
        <lucide-icon [img]="icons.X" [size]="14" />
      </button>
    }
  `,
  styleUrl: './search-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.compact]': 'compact()' },
})
export class SearchFieldComponent {
  readonly value = model('');
  readonly placeholder = input('Search');
  readonly ariaLabel = input('');
  /** Smaller, flatter variant for use inside panels. */
  readonly compact = input(false, { transform: booleanAttribute });
  readonly ariaControls = input<string | null>(null);
  readonly ariaActiveDescendant = input<string | null>(null);

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  protected readonly icons = { Search, X };

  protected clear(): void {
    this.value.set('');
    this.field().nativeElement.focus();
  }
}
