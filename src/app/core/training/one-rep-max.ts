/**
 * Estimated one-rep max using the Epley formula: weight × (1 + reps / 30).
 * A single rep is its own 1RM; returns 0 when there's no weight or reps.
 */
export function estimate1rm(weight: number | null | undefined, reps: number | null | undefined): number {
  const w = weight ?? 0;
  const r = reps ?? 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}
