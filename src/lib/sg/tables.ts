/**
 * Expected-strokes-to-hole-out tables (scratch / PGA Tour benchmark).
 *
 * Values are derived from Mark Broadie's published strokes-gained benchmarks
 * ("Every Shot Counts"). Each table is a list of [distance, expectedStrokes]
 * control points; lookups linearly interpolate and clamp to the table bounds.
 *
 * Distances: tee/approach/short-game in YARDS, putting in FEET.
 *
 * These tables are intentionally the single source of truth for the engine and
 * are unit-tested for monotonic sanity in tables.test.ts.
 */

export type Table = ReadonlyArray<readonly [number, number]>;

/** Linear interpolation with clamping to table bounds. */
export function interp(tbl: Table, x: number): number {
  const first = tbl[0];
  const last = tbl[tbl.length - 1];
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 0; i < tbl.length - 1; i++) {
    const [x0, y0] = tbl[i];
    const [x1, y1] = tbl[i + 1];
    if (x >= x0 && x <= x1) {
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return last[1];
}

// --- Tee shot (par 4 / par 5), by hole length in yards ---
export const E_TEE: Table = [
  [100, 2.92],
  [120, 2.99],
  [140, 2.97],
  [160, 2.99],
  [180, 3.05],
  [200, 3.12],
  [220, 3.17],
  [240, 3.25],
  [260, 3.38],
  [280, 3.51],
  [300, 3.62],
  [320, 3.74],
  [340, 3.83],
  [360, 3.92],
  [380, 4.0],
  [400, 4.08],
  [420, 4.15],
  [440, 4.22],
  [460, 4.28],
  [480, 4.34],
  [500, 4.4],
  [540, 4.52],
  [580, 4.64],
];

// --- Approach from the fairway, by distance to pin in yards ---
export const E_FAIRWAY: Table = [
  [10, 2.18],
  [20, 2.4],
  [30, 2.52],
  [40, 2.6],
  [50, 2.66],
  [60, 2.7],
  [80, 2.75],
  [100, 2.8],
  [120, 2.85],
  [140, 2.91],
  [160, 2.98],
  [180, 3.05],
  [200, 3.12],
  [220, 3.2],
  [240, 3.3],
  [260, 3.41],
  [280, 3.52],
];

// --- Approach from the rough ---
export const E_ROUGH: Table = [
  [10, 2.34],
  [20, 2.59],
  [30, 2.72],
  [40, 2.78],
  [50, 2.85],
  [60, 2.91],
  [80, 2.97],
  [100, 3.02],
  [120, 3.06],
  [140, 3.1],
  [160, 3.17],
  [180, 3.25],
  [200, 3.33],
  [220, 3.42],
  [240, 3.52],
  [260, 3.63],
];

// --- Approach / shot from the sand (fairway + greenside bunkers) ---
export const E_SAND: Table = [
  [10, 2.43],
  [20, 2.53],
  [30, 2.66],
  [40, 2.82],
  [50, 2.92],
  [60, 3.0],
  [80, 3.1],
  [100, 3.18],
  [120, 3.21],
  [140, 3.22],
  [160, 3.28],
  [180, 3.4],
  [200, 3.55],
  [220, 3.7],
  [240, 3.84],
];

// --- Recovery (trees / deep trouble) ---
export const E_RECOVERY: Table = [
  [20, 3.45],
  [40, 3.25],
  [60, 3.1],
  [80, 3.05],
  [100, 3.0],
  [120, 3.05],
  [140, 3.1],
  [160, 3.15],
  [180, 3.21],
  [200, 3.28],
  [220, 3.4],
  [240, 3.55],
];

// --- Around the green short game (inside ~30 yds), mixed lies ---
export const E_AROUND_GREEN: Table = [
  [3, 2.1],
  [5, 2.2],
  [10, 2.4],
  [15, 2.46],
  [20, 2.51],
  [25, 2.55],
  [30, 2.6],
];

// --- Putting, by distance in feet ---
export const E_PUTT: Table = [
  [1, 1.0],
  [2, 1.01],
  [3, 1.04],
  [4, 1.13],
  [5, 1.23],
  [6, 1.34],
  [7, 1.42],
  [8, 1.5],
  [9, 1.56],
  [10, 1.61],
  [12, 1.68],
  [15, 1.78],
  [20, 1.87],
  [25, 1.94],
  [30, 2.0],
  [35, 2.05],
  [40, 2.1],
  [50, 2.2],
  [60, 2.27],
  [90, 2.45],
];

export const eTee = (yds: number): number => interp(E_TEE, yds);
export const eFairway = (yds: number): number => interp(E_FAIRWAY, yds);
export const eRough = (yds: number): number => interp(E_ROUGH, yds);
export const eSand = (yds: number): number => interp(E_SAND, yds);
export const eRecovery = (yds: number): number => interp(E_RECOVERY, yds);
export const eAroundGreen = (yds: number): number => interp(E_AROUND_GREEN, yds);
export const ePutt = (ft: number): number => interp(E_PUTT, ft);

/** Expected strokes for an approach given the lie before the shot. */
export function eApproachByLie(
  lie: 'fairway' | 'rough' | 'sand' | 'recovery',
  yds: number,
): number {
  switch (lie) {
    case 'fairway':
      return eFairway(yds);
    case 'rough':
      return eRough(yds);
    case 'sand':
      return eSand(yds);
    case 'recovery':
      return eRecovery(yds);
  }
}
