import { ConfirmOptions } from '@shared/components/confirm-dialog/confirm.service';

/** Shared by the routine list and editor so the wording stays identical. */
export function deleteRoutineDialog(name: string): ConfirmOptions {
  return {
    title: 'Delete routine?',
    message: `"${name}" will be deleted. Workouts you've already logged stay in History.`,
    confirmText: 'Delete',
    tone: 'danger',
  };
}
