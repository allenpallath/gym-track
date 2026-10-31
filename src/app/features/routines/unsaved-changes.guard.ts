import { inject, Signal } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmService } from '@shared/components/confirm-dialog/confirm.service';

export interface HasUnsavedChanges {
  hasUnsavedChanges: Signal<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  !component.hasUnsavedChanges() ||
  inject(ConfirmService).ask({
    title: 'Unsaved changes',
    message: 'Leave without saving this routine?',
    confirmText: 'Leave',
    cancelText: 'Keep editing',
    tone: 'danger',
  });
