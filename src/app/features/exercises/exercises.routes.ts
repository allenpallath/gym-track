import { Routes } from '@angular/router';

export const EXERCISES_ROUTES: Routes = [
  {
    path: '',
    title: 'Exercises',
    loadComponent: () => import('./exercise-browser/exercise-browser.page').then((m) => m.ExerciseBrowserPage),
  },
  {
    path: ':id',
    title: 'Exercise',
    loadComponent: () => import('./exercise-detail/exercise-detail.page').then((m) => m.ExerciseDetailPage),
  },
];
