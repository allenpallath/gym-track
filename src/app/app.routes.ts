import { Routes } from '@angular/router';

// Every feature is lazy-loaded; each feature folder owns its own child routes.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'home',
    title: 'GymTrack',
    loadChildren: () => import('@features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },
  {
    path: 'routines',
    loadChildren: () => import('@features/routines/routines.routes').then((m) => m.ROUTINES_ROUTES),
  },
  {
    path: 'exercises',
    loadChildren: () => import('@features/exercises/exercises.routes').then((m) => m.EXERCISES_ROUTES),
  },
  {
    path: 'session',
    loadChildren: () => import('@features/session/session.routes').then((m) => m.SESSION_ROUTES),
  },
  {
    path: 'history',
    loadChildren: () => import('@features/tracking/tracking.routes').then((m) => m.TRACKING_ROUTES),
  },
  {
    path: 'settings',
    loadChildren: () => import('@features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
  },
  { path: '**', redirectTo: 'home' },
];
