import { ApplicationConfig, inject, isDevMode, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { environment } from '@env/environment';
import { GYM_TRACK_DB } from '@core/data/local/local-repositories';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { provideDataLayer } from '@core/data/data-layer.providers';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    provideRouter(
      routes,
      // Route params (e.g. `:id`) bind straight to signal `input()`s on routed components.
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      withViewTransitions(),
    ),
    provideDataLayer(),
    // Dev builds only: seed demo routines/sessions (see core/data/local/demo-seed.ts).
    provideAppInitializer(async () => {
      if (!isDevMode() || environment.dataSource !== 'local') return;
      const db = inject(GYM_TRACK_DB);
      const { applyDemoSeed } = await import('@core/data/local/demo-seed');
      await applyDemoSeed(db, new URL(location.href)).catch((err) => console.error('Demo seed failed', err));
    }),
  ],
};
