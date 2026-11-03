import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule, SkipForward, Timer } from 'lucide-angular';
import { RestTimerService } from '@core/state/rest-timer.service';
import { DurationPipe } from '@shared/pipes/duration.pipe';

/** Floating rest countdown with −15 / +15 / skip. Renders nothing when no rest is running. */
@Component({
  selector: 'app-rest-timer',
  imports: [LucideAngularModule, DurationPipe],
  template: `
    @if (timer.active()) {
      <div class="pill" role="timer" aria-live="polite" animate.enter="fade-in" animate.leave="fade-out">
        <span class="icon"><lucide-icon [img]="icons.Timer" [size]="18" /></span>
        <span class="text">
          <span class="label">Rest</span>
          <span class="time">{{ timer.remainingSec() | duration: 'clock' }}</span>
        </span>
        <button type="button" class="adjust" aria-label="15 seconds less" (click)="timer.add(-15)">−15</button>
        <button type="button" class="adjust" aria-label="15 seconds more" (click)="timer.add(15)">+15</button>
        <button type="button" class="skip" aria-label="Skip rest" (click)="timer.skip()">
          <lucide-icon [img]="icons.SkipForward" [size]="18" />
        </button>
      </div>
    }
  `,
  styleUrl: './rest-timer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestTimerComponent {
  protected readonly timer = inject(RestTimerService);
  protected readonly icons = { SkipForward, Timer };
}
