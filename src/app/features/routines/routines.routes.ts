import { Routes } from '@angular/router';
import { unsavedChangesGuard } from './unsaved-changes.guard';

export const ROUTINES_ROUTES: Routes = [
  {
    path: '',
    title: 'Routines · GymTrack',
    loadComponent: () => import('./routine-list/routine-list.page').then((m) => m.RoutineListPage),
  },
  {
    path: 'new',
    title: 'New routine · GymTrack',
    data: { hideNav: true },
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./routine-editor/routine-editor.page').then((m) => m.RoutineEditorPage),
  },
  {
    path: ':id',
    title: 'Edit routine · GymTrack',
    data: { hideNav: true },
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./routine-editor/routine-editor.page').then((m) => m.RoutineEditorPage),
  },
];
