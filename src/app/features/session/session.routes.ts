import { Routes } from '@angular/router';

export const SESSION_ROUTES: Routes = [
  {
    path: '',
    title: 'Workout · GymTrack',
    data: { hideNav: true },
    loadComponent: () => import('./active-session/active-session.page').then((m) => m.ActiveSessionPage),
  },
];
