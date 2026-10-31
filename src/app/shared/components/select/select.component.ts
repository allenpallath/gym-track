import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input, model, signal } from '@angular/core';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition, Overlay } from '@angular/cdk/overlay';
import { A11yModule } from '@angular/cdk/a11y';
import { LucideAngularModule, Check, ChevronDown } from 'lucide-angular';
import { createId } from '@core/utils/id';
import { SearchFieldComponent } from '../search-field/search-field.component';

export interface SelectOption<T> {
  value: T;
  label: string;
}

/**
 * Design-system dropdown (replaces native <select>). Values are compared with `===`.
 *
 *   <app-select label="Exercise" [options]="opts()" [(value)]="selectedId" searchable />
 *
 * Accessibility: trigger is a combobox button; the panel is a listbox using
 * aria-activedescendant, so focus stays on one element while arrows move the highlight.
 */
@Component({
  selector: 'app-select',
  imports: [CdkOverlayOrigin, CdkConnectedOverlay, A11yModule, LucideAngularModule, SearchFieldComponent],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectComponent<T> {
  private readonly overlay = inject(Overlay);

  readonly options = input.required<SelectOption<T>[]>();
  readonly value = model<T | null>(null);
  /** Visible label above the trigger. Leave empty and set `ariaLabel` for a compact control. */
  readonly label = input('');
  readonly ariaLabel = input('');
  readonly placeholder = input('Select…');
  /** Adds a filter box to the panel — worth it for long lists. */
  readonly searchable = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly icons = { Check, ChevronDown };
  protected readonly uid = `sel-${createId().slice(0, 8)}`;
  protected readonly scrollStrategy = this.overlay.scrollStrategies.reposition();
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
  ];

  protected readonly open = signal(false);
  protected readonly panelWidth = signal(0);
  protected readonly query = signal('');
  protected readonly activeIndex = signal(-1);

  protected readonly selectedLabel = computed(() => {
    const current = this.value();
    return this.options().find((o) => o.value === current)?.label ?? null;
  });

  /** Options decorated with ids / state so the template needs no method calls. */
  protected readonly viewOptions = computed(() => {
    const q = this.query().trim().toLowerCase();
    const current = this.value();
    return this.options()
      .filter((o) => !q || o.label.toLowerCase().includes(q))
      .map((o, i) => ({ ...o, id: `${this.uid}-opt-${i}`, selected: o.value === current }));
  });

  protected readonly activeId = computed(() => this.viewOptions()[this.activeIndex()]?.id ?? null);

  protected toggle(origin: HTMLElement): void {
    if (this.open()) {
      this.close();
    } else {
      this.openPanel(origin);
    }
  }

  protected onTriggerKeydown(event: KeyboardEvent, origin: HTMLElement): void {
    if (this.open()) return;
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      this.openPanel(origin);
    }
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    const count = this.viewOptions().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(count ? (this.activeIndex() + 1) % count : -1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(count ? (this.activeIndex() - 1 + count) % count : -1);
        break;
      case 'Home':
        event.preventDefault();
        this.moveActive(count ? 0 : -1);
        break;
      case 'End':
        event.preventDefault();
        this.moveActive(count - 1);
        break;
      case 'Enter': {
        event.preventDefault();
        const option = this.viewOptions()[this.activeIndex()];
        if (option) this.choose(option.value);
        break;
      }
      case 'Escape':
      case 'Tab':
        event.preventDefault();
        this.close();
        break;
    }
  }

  protected onQueryChange(query: string): void {
    this.query.set(query);
    this.activeIndex.set(this.viewOptions().length ? 0 : -1);
  }

  protected choose(value: T): void {
    this.value.set(value);
    this.close();
  }

  protected close(): void {
    this.open.set(false);
  }

  private openPanel(origin: HTMLElement): void {
    if (this.disabled()) return;
    this.query.set('');
    this.panelWidth.set(origin.getBoundingClientRect().width);
    const selected = this.viewOptions().findIndex((o) => o.selected);
    this.activeIndex.set(Math.max(selected, 0));
    this.open.set(true);
    // Panel renders on the next frame; then bring the highlighted option into view.
    requestAnimationFrame(() => this.scrollActiveIntoView());
  }

  private moveActive(index: number): void {
    this.activeIndex.set(index);
    this.scrollActiveIntoView();
  }

  private scrollActiveIntoView(): void {
    const id = this.activeId();
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'nearest' });
  }
}
