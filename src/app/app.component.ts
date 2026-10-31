import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ActiveSessionService } from '@core/state/active-session.service';
import { BottomNavComponent } from '@layout/bottom-nav/bottom-nav.component';
import { SessionPillComponent } from '@layout/session-pill/session-pill.component';

/** Route data flags understood by the shell. */
export interface ShellRouteData {
  /** Hide the bottom nav (full-screen flows like the editor / live session). */
  hideNav?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BottomNavComponent, SessionPillComponent],
  template: `
    <main>
      <router-outlet />
    </main>
    @if (showSessionPill()) {
      <app-session-pill />
    }
    @if (!routeData().hideNav) {
      <app-bottom-nav />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly activeSession = inject(ActiveSessionService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Data of the deepest active route, re-evaluated on every navigation. */
  protected readonly routeData = computed<ShellRouteData>(() => {
    this.url();
    let snapshot: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    let data: ShellRouteData = {};
    while (snapshot) {
      data = { ...data, ...(snapshot.data as ShellRouteData) };
      snapshot = snapshot.firstChild;
    }
    return data;
  });

  protected readonly showSessionPill = computed(
    () => this.activeSession.isActive() && !this.url().startsWith('/session') && !this.routeData().hideNav,
  );
}
