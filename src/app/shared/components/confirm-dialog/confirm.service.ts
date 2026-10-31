import { Injectable, signal } from '@angular/core';

export type ConfirmTone = 'danger' | 'default';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Defaults to "Confirm". */
  confirmText?: string;
  /** Defaults to "Cancel". */
  cancelText?: string;
  /** `danger` = pink confirm button and initial focus on Cancel. */
  tone?: ConfirmTone;
}

export interface ConfirmRequest extends Required<ConfirmOptions> {
  id: number;
}

/**
 * Design-system replacement for `window.confirm()`.
 *
 *   if (!(await this.confirm.ask({ title: 'Delete routine?', confirmText: 'Delete', tone: 'danger' }))) return;
 *
 * Rendered by the single <app-confirm-dialog> in the app shell.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly _current = signal<ConfirmRequest | null>(null);
  private resolveCurrent: ((result: boolean) => void) | null = null;
  private nextId = 0;

  readonly current = this._current.asReadonly();

  ask(options: ConfirmOptions): Promise<boolean> {
    // Only one dialog at a time: a newer request cancels the pending one.
    this.settle(false);
    return new Promise<boolean>((resolve) => {
      this.resolveCurrent = resolve;
      this._current.set({
        id: ++this.nextId,
        title: options.title,
        message: options.message ?? '',
        confirmText: options.confirmText ?? 'Confirm',
        cancelText: options.cancelText ?? 'Cancel',
        tone: options.tone ?? 'default',
      });
    });
  }

  /** Called by the dialog component. */
  settle(result: boolean): void {
    const resolve = this.resolveCurrent;
    this.resolveCurrent = null;
    this._current.set(null);
    resolve?.(result);
  }
}
