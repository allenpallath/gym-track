import { Routes } from '@angular/router';

export const TRACKING_ROUTES: Routes = [
  {
    path: '',
    title: 'History · GymTrack',
    loadComponent: () => import('./history/history.page').then((m) => m.HistoryPage),
  },
];
