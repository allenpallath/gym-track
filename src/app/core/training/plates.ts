export interface PlateLoad {
  /** Plates for ONE side of the bar, heaviest first. */
  plates: number[];
  /** Total kg (both sides) that can't be made with the available plates. */
  remainder: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Greedy plate breakdown per side for a target total weight on a given bar. */
export function platesPerSide(targetKg: number, barKg: number, platesKg: number[]): PlateLoad {
  let perSide = round2((targetKg - barKg) / 2);
  if (perSide <= 0) return { plates: [], remainder: 0 };

  const plates: number[] = [];
  for (const plate of [...platesKg].filter((p) => p > 0).sort((a, b) => b - a)) {
    while (perSide - plate >= -1e-9) {
      plates.push(plate);
      perSide = round2(perSide - plate);
    }
  }
  return { plates, remainder: round2(perSide * 2) };
}
