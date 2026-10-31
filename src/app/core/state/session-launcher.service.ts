import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Routine } from '@shared/models';
import { ActiveSessionService } from './active-session.service';

/** Single entry point for "Start workout" buttons anywhere in the app. */
@Injectable({ providedIn: 'root' })
export class SessionLauncherService {
  private readonly activeSession = inject(ActiveSessionService);
  private readonly router = inject(Router);

  /** Starts a session from a routine (or an empty one with `null`) and opens it. */
  async launch(routine: Routine | null): Promise<void> {
    const current = this.activeSession.draft();
    if (current) {
      const replace = confirm(`"${current.routineName}" is still in progress. Discard it and start a new workout?`);
      if (!replace) {
        await this.router.navigateByUrl('/session');
        return;
      }
    }
    this.activeSession.start(routine);
    await this.router.navigateByUrl('/session');
  }
}
