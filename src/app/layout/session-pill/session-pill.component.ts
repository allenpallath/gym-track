import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Timer } from 'lucide-angular';
import { ActiveSessionService } from '@core/state/active-session.service';
import { DurationPipe } from '@shared/pipes/duration.pipe';

/** Floating "workout in progress" shortcut shown above the nav while a session runs. */
@Component({
  selector: 'app-session-pill',
  imports: [RouterLink, LucideAngularModule, DurationPipe],
  template: `
    <a routerLink="/session" class="pill jelly" animate.enter="fade-in">
      <span class="dot"></span>
      <span class="name">{{ session.draft()?.routineName }}</span>
      <lucide-icon [img]="timerIcon" [size]="16" />
      <span class="time">{{ session.elapsedSec() | duration: 'clock' }}</span>
    </a>
  `,
  styles: `
    :host {
      position: fixed;
      left: 0;
      right: 0;
      bottom: calc(var(--gt-nav-height) + 22px + env(safe-area-inset-bottom));
      z-index: 39;
      display: flex;
      justify-content: center;
      pointer-events: none;
    }
    .pill {
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 340px;
      padding: 10px 16px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 0.85rem;
      text-decoration: none;
      pointer-events: auto;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--gt-color-pink-strong);
      animation: pulse 1.4s ease-in-out infinite;
    }
    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .time {
      font-variant-numeric: tabular-nums;
    }
    @keyframes pulse {
      50% {
        opacity: 0.3;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionPillComponent {
  protected readonly session = inject(ActiveSessionService);
  protected readonly timerIcon = Timer;
}
