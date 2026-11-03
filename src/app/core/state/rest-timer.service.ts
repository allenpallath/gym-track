import { computed, DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { SettingsStore } from './settings.store';

/**
 * Countdown between sets. Stores an absolute end time (not a counter) so it
 * stays correct when the tab is throttled or the phone sleeps.
 */
@Injectable({ providedIn: 'root' })
export class RestTimerService {
  private readonly settings = inject(SettingsStore);
  private readonly document = inject(DOCUMENT);

  private readonly endsAt = signal<number | null>(null);
  private readonly now = signal(Date.now());
  private tickHandle: ReturnType<typeof setInterval> | null = null;

  readonly active = computed(() => this.endsAt() !== null);
  readonly remainingSec = computed(() => {
    const end = this.endsAt();
    return end === null ? 0 : Math.max(0, Math.ceil((end - this.now()) / 1000));
  });

  start(seconds: number): void {
    if (seconds <= 0) return;
    this.endsAt.set(Date.now() + seconds * 1000);
    this.now.set(Date.now());
    this.ensureTicking();
    void this.requestPermissionOnce();
  }

  add(seconds: number): void {
    const end = this.endsAt();
    if (end === null) return;
    const next = end + seconds * 1000;
    if (next <= Date.now()) {
      this.skip();
      return;
    }
    this.endsAt.set(next);
  }

  skip(): void {
    this.endsAt.set(null);
    this.stopTicking();
  }

  private ensureTicking(): void {
    if (this.tickHandle) return;
    this.tickHandle = setInterval(() => {
      this.now.set(Date.now());
      if (this.active() && this.remainingSec() === 0) this.complete();
    }, 250);
  }

  private stopTicking(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.tickHandle = null;
  }

  private complete(): void {
    this.skip();
    navigator.vibrate?.([200, 100, 200]);
    if (
      this.settings.settings().restNotifications &&
      this.document.hidden &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification('Rest over', { body: 'Time for your next set.', tag: 'gym-track-rest' });
    }
  }

  /** Asks once, lazily, and only if the user wants rest notifications. */
  private async requestPermissionOnce(): Promise<void> {
    if (!this.settings.settings().restNotifications || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    try {
      await Notification.requestPermission();
    } catch {
      // Older Safari only supports the callback form; skipping is fine — vibration still works.
    }
  }
}
