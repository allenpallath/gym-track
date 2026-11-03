import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    title: 'Settings · GymTrack',
    loadComponent: () => import('./settings.page').then((m) => m.SettingsPage),
  },
];
