/** Days between body-weight reminders. */
export const WEIGH_IN_INTERVAL_DAYS = 14;

const DAY_MS = 86_400_000;

/**
 * Whether to prompt for a weigh-in: the last entry (local `YYYY-MM-DD`) is at
 * least the interval old — or there is none — and the prompt wasn't snoozed
 * within the interval.
 */
export function isWeighInDue(lastEntryDate: string | null, snoozedAt: string | null, now = new Date()): boolean {
  const due = (from: number) => now.getTime() - from >= WEIGH_IN_INTERVAL_DAYS * DAY_MS;
  // Parse the day key as local midnight; `new Date('YYYY-MM-DD')` would be UTC.
  const lastLogged = lastEntryDate ? new Date(`${lastEntryDate}T00:00:00`).getTime() : null;
  if (lastLogged !== null && !due(lastLogged)) return false;
  return snoozedAt === null || due(Date.parse(snoozedAt));
}

/** Whole days since a local `YYYY-MM-DD`, for the reminder copy. */
export function daysSince(date: string, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(`${date}T00:00:00`).getTime()) / DAY_MS));
}
