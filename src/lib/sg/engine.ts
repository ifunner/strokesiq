/**
 * The strokes-gained engine. Zero UI dependencies.
 *
 * SG = E_start − (1 + E_end), per shot, attributed to a category.
 * Round SG = element-wise sum of hole SG. biggestLeak = most-negative category.
 *
 * Edge-case rules (spec 4.3) are implemented explicitly and documented inline.
 */

import { eTee, eFairway, eRough, ePutt, eApproachByLie } from './tables';
import {
  CATEGORY_ORDER,
  type CategoryKey,
  type CategorySG,
  type Hole,
  type Round,
  type RoundStats,
} from './types';

/** Assumed distance off the green when a green is missed (we don't capture it). */
export const MISSED_GREEN_DEFAULT_YDS = 12;
/** Fraction of the worst leak a player can realistically recover. */
export const RECOVERABLE_FRACTION = 0.7;
/** A round must have at least this many holes to count toward rolling trends. */
export const MIN_COUNTING_HOLES = 9;
/** Assumed first-putt distance (ft) after a missed green when not captured. */
const ASSUMED_AROUND_GREEN_PUTT_FT = 6;

const TEE_TABLE_MAX_YDS = 580;

function zeroSG(): CategorySG {
  return { driving: 0, approach: 0, short: 0, putting: 0 };
}

/**
 * Hole length used as the tee-shot start distance.
 * Preferred: saved course hole yardage (honest par-5 driving SG, decision Q4=A).
 * Fallback: drive + approach (+150 layup estimate on par 5).
 */
export function teeStartYards(h: Hole, courseHoleYds?: number): number {
  if (courseHoleYds && courseHoleYds > 0) return courseHoleYds;
  const drive = h.driveYds ?? 0;
  if (h.par === 5) return drive + h.approachYds + 150;
  return drive + h.approachYds;
}

/** Per-category strokes gained for a single hole. */
export function holeSG(h: Hole, courseHoleYds?: number): CategorySG {
  const sg = zeroSG();
  const inFairway = h.teeResult === 'fairway';

  // --- Tee (par 4 / par 5 only) ---
  if (h.par >= 4) {
    const start = Math.min(teeStartYards(h, courseHoleYds), TEE_TABLE_MAX_YDS);
    const endLie = inFairway ? eFairway(h.approachYds) : eRough(h.approachYds);
    sg.driving = eTee(start) - (1 + endLie);
    if (h.teeResult === 'penalty') sg.driving -= 1; // tee penalty → driving
  }

  // --- Approach ---
  // Par 3: the tee shot IS the approach (start from the tee table).
  const apStart =
    h.par === 3
      ? eTee(h.approachYds)
      : inFairway
        ? eFairway(h.approachYds)
        : eRough(h.approachYds);
  const apEnd = h.gir
    ? ePutt(h.firstPuttFt)
    : eApproachByLie(
        h.lie === 'sand'
          ? 'sand'
          : h.lie === 'fairway'
            ? 'fairway'
            : h.lie === 'recovery'
              ? 'recovery'
              : 'rough',
        MISSED_GREEN_DEFAULT_YDS,
      );
  sg.approach = apStart - (1 + apEnd);

  // --- Short game (only when the green was missed) ---
  if (!h.gir) {
    const sgStart = eApproachByLie(
      h.lie === 'sand'
        ? 'sand'
        : h.lie === 'fairway'
          ? 'fairway'
          : h.lie === 'recovery'
            ? 'recovery'
            : 'rough',
      MISSED_GREEN_DEFAULT_YDS,
    );
    if (h.putts <= 0) {
      // Chip-in / holed from off the green: the short-game shot ended the hole.
      sg.short = sgStart - 1;
    } else {
      const endPuttFt =
        h.firstPuttFt > 0 ? h.firstPuttFt : ASSUMED_AROUND_GREEN_PUTT_FT;
      sg.short = sgStart - (1 + ePutt(endPuttFt));
    }
  }

  // --- Putting ---
  // First putt valued cleanly; extra putts fold in as negative. Skip if holed
  // out off the green (putts === 0) — there was no putt.
  if (h.putts > 0) {
    sg.putting = ePutt(h.firstPuttFt) - h.putts;
  }

  // --- Remaining (non-tee) penalties → approach ---
  const teePens = h.teeResult === 'penalty' ? 1 : 0;
  const nonTeePens = h.penalties - teePens;
  if (nonTeePens > 0) sg.approach -= nonTeePens;

  return sg;
}

/** Element-wise sum of hole SG across a set of holes. */
export function sumCategorySG(perHole: CategorySG[]): CategorySG {
  const total = zeroSG();
  for (const sg of perHole) {
    for (const k of CATEGORY_ORDER) total[k] += sg[k];
  }
  return total;
}

/** Round SG, optionally using per-hole yardage indexed by hole number. */
export function roundSG(
  holes: Hole[],
  holeYdsByNumber?: Record<number, number | undefined>,
): CategorySG {
  return sumCategorySG(
    holes.map((h) => holeSG(h, holeYdsByNumber?.[h.number])),
  );
}

/** The most-negative category. Ties resolve by CATEGORY_ORDER. */
export function biggestLeak(sg: CategorySG): CategoryKey {
  let worst: CategoryKey = CATEGORY_ORDER[0];
  for (const k of CATEGORY_ORDER) {
    if (sg[k] < sg[worst]) worst = k;
  }
  return worst;
}

export function computeRoundStats(holes: Hole[], coursePar: number): RoundStats {
  const score = holes.reduce((s, h) => s + h.score, 0);
  const putts = holes.reduce((s, h) => s + h.putts, 0);
  const penalties = holes.reduce((s, h) => s + h.penalties, 0);
  const threePutts = holes.filter((h) => h.putts >= 3).length;

  const greensHit = holes.filter((h) => h.gir).length;
  const girPct = holes.length ? (greensHit / holes.length) * 100 : 0;

  const teeHoles = holes.filter((h) => h.par >= 4);
  const fairwaysHit = teeHoles.filter((h) => h.teeResult === 'fairway').length;
  const firPct = teeHoles.length ? (fairwaysHit / teeHoles.length) * 100 : 0;

  // vs par is relative to the par of the holes actually played.
  const playedPar = holes.reduce((s, h) => s + h.par, 0);
  const vsPar = score - (holes.length === 18 ? coursePar : playedPar);

  return {
    putts,
    girPct: Math.round(girPct),
    firPct: Math.round(firPct),
    penalties,
    threePutts,
    vsPar,
  };
}

export interface ScoringPotential {
  avgScore: number;
  potential: number;
  strokesLeft: number; // avgScore - potential
  bestScore: number;
  leak: CategoryKey;
  leakMagnitude: number; // mean SG of the leak category (negative)
}

/**
 * Scoring Potential hero metric over the rolling window of counting rounds.
 * Returns null until there is at least one counting round.
 */
export function scoringPotential(rounds: Round[]): ScoringPotential | null {
  const counting = rounds.filter((r) => r.complete);
  if (counting.length === 0) return null;

  const scores = counting.map((r) => r.stats.vsPar + r.coursePar);
  const avgScore = mean(scores);
  const bestScore = Math.min(...scores);

  // Worst leak = the category that is, on average, most negative.
  const meanSG = zeroSG();
  for (const r of counting) {
    for (const k of CATEGORY_ORDER) meanSG[k] += r.sg[k];
  }
  for (const k of CATEGORY_ORDER) meanSG[k] /= counting.length;
  const leak = biggestLeak(meanSG);
  const leakMagnitude = meanSG[leak]; // negative

  // Recover a realistic fraction of the leak; never promise below the best round.
  const raw = avgScore + leakMagnitude * RECOVERABLE_FRACTION;
  const potential = Math.max(Math.round(raw), bestScore);

  return {
    avgScore: round1(avgScore),
    potential,
    strokesLeft: Math.max(0, round1(avgScore) - potential),
    bestScore,
    leak,
    leakMagnitude: round1(leakMagnitude),
  };
}

/** Rolling-window mean SG by category across counting rounds (most recent `window`). */
export function rollingCategorySG(rounds: Round[], window = 5): CategorySG | null {
  const counting = rounds
    .filter((r) => r.complete)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, window);
  if (counting.length === 0) return null;
  const total = zeroSG();
  for (const r of counting) {
    for (const k of CATEGORY_ORDER) total[k] += r.sg[k];
  }
  for (const k of CATEGORY_ORDER) total[k] /= counting.length;
  return total;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
