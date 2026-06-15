/**
 * Diagnostic + prescription copy templates.
 *
 * Copy is generated per category from real rolling-window numbers — never
 * hardcoded. Each category owns its own headline/detail template. This is the
 * seam the future "AI round review" replaces with an LLM call over the round JSON.
 */

import type { CategoryKey, Hole, MissCell, Round } from '../sg/types';

export interface SupportingMetrics {
  rounds: number;
  girPct: number;
  firPct: number;
  threePuttsPerRound: number;
  upDownPct: number;
  penaltiesPerRound: number;
  missShortPct: number; // share of missed greens that finished short
  dominantMiss: MissDirection | null;
}

export type MissDirection = 'short' | 'long' | 'left' | 'right';

export interface Copy {
  headline: string;
  detail: string;
}

const fmt = (n: number, d = 1): string => n.toFixed(d);
const pct = (n: number): string => `${Math.round(n)}%`;

/** The diagnostic shown on Home's "Biggest leak" card. */
export function leakCopy(
  cat: CategoryKey,
  magnitude: number,
  m: SupportingMetrics,
): Copy {
  const mag = fmt(Math.abs(magnitude));
  switch (cat) {
    case 'approach':
      return {
        headline: `Approach is your biggest leak — about ${mag} strokes a round.`,
        detail: m.dominantMiss
          ? `You're hitting ${pct(m.girPct)} of greens and missing ${m.dominantMiss}. The misses are costing you more than the swings feel like they should.`
          : `You're hitting ${pct(m.girPct)} of greens. Tightening your stock yardages is where the strokes come back.`,
      };
    case 'driving':
      return {
        headline: `Driving is your biggest leak — about ${mag} strokes a round.`,
        detail: `You're finding ${pct(m.firPct)} of fairways with ${fmt(m.penaltiesPerRound)} penalties a round. Out-of-position tee shots cost you before you ever hit an approach.`,
      };
    case 'short':
      return {
        headline: `Your short game is the biggest leak — about ${mag} strokes a round.`,
        detail: `You're converting ${pct(m.upDownPct)} of up-and-downs when you miss the green. The chip-and-one-putt is where rounds slip away.`,
      };
    case 'putting':
      return {
        headline: `Putting is your biggest leak — about ${mag} strokes a round.`,
        detail: `${fmt(m.threePuttsPerRound)} three-putts a round. First-putt speed control is the fastest fix here.`,
      };
  }
}

/** The prescription shown on Round Review's "Practice this next" card. */
export function reviewRec(
  cat: CategoryKey,
  magnitude: number,
  m: SupportingMetrics,
): Copy {
  const mag = fmt(Math.abs(magnitude));
  switch (cat) {
    case 'approach':
      return {
        headline: `Approach cost you the most — ${mag} strokes.`,
        detail: m.dominantMiss
          ? `Most damage came from missing ${m.dominantMiss}. Next 3 sessions: stock-yardage approach play, and club up one extra to take the ${m.dominantMiss} miss out.`
          : `Spend your next 3 sessions on stock-yardage approach play and committing to a number.`,
      };
    case 'driving':
      return {
        headline: `Driving cost you the most — ${mag} strokes.`,
        detail: `Penalties and wayward tee shots set you back. Build one reliable stock tee shot you can find, even if it's shorter.`,
      };
    case 'short':
      return {
        headline: `Short game cost you the most — ${mag} strokes.`,
        detail: `Up-and-downs aren't converting. Work 10–30 yd pitches and varied greenside lies until the first one settles inside 6 feet.`,
      };
    case 'putting':
      return {
        headline: `Putting cost you the most — ${mag} strokes.`,
        detail: `Three-putts and mid-range misses. Drill lag speed from 25–40 ft, then the 6–10 ft range.`,
      };
  }
}

/** Empty-state copy while the biggest-leak headline is gated (< 3 rounds). */
export function gatingCopy(roundsLogged: number, threshold = 3): string {
  const need = Math.max(0, threshold - roundsLogged);
  const plural = need === 1 ? 'round' : 'rounds';
  return `Log ${need} more ${plural} and StrokesIQ will call your biggest leak. One round is too noisy to prescribe from.`;
}

/** Caption summarizing the miss-pattern heat grid. */
export function missPatternCaption(holes: Hole[]): string {
  const missed = holes.filter((h) => !h.gir);
  if (missed.length === 0) return 'You hit every green you played. Keep doing that.';
  const dir = dominantMiss(missed.map((h) => h.missCell));
  if (!dir) return `${missed.length} greens missed, with no single direction dominating.`;
  const count = missed.filter((h) => missDirectionOf(h.missCell) === dir).length;
  return `${count} of ${missed.length} missed greens finished ${dir}.`;
}

// --- metric helpers ---

const SHORT = new Set<MissCell>(['S', 'SL', 'SR']);
const LONG = new Set<MissCell>(['L', 'LL', 'LR']);
const LEFT = new Set<MissCell>(['left', 'SL', 'LL']);
const RIGHT = new Set<MissCell>(['right', 'SR', 'LR']);

function missDirectionOf(cell: MissCell): MissDirection | null {
  if (cell === 'green') return null;
  if (SHORT.has(cell)) return 'short';
  if (LONG.has(cell)) return 'long';
  if (LEFT.has(cell)) return 'left';
  if (RIGHT.has(cell)) return 'right';
  return null;
}

export function dominantMiss(cells: MissCell[]): MissDirection | null {
  const tally: Record<MissDirection, number> = { short: 0, long: 0, left: 0, right: 0 };
  let any = false;
  for (const c of cells) {
    if (SHORT.has(c)) (tally.short++, (any = true));
    if (LONG.has(c)) (tally.long++, (any = true));
    if (LEFT.has(c)) (tally.left++, (any = true));
    if (RIGHT.has(c)) (tally.right++, (any = true));
  }
  if (!any) return null;
  return (Object.entries(tally) as [MissDirection, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0][0];
}

/** Compute supporting metrics across the given (already-windowed) rounds. */
export function supportingMetrics(rounds: Round[]): SupportingMetrics {
  const n = rounds.length || 1;
  const allHoles = rounds.flatMap((r) => r.holes);
  const missed = allHoles.filter((h) => !h.gir);
  const upDownTries = missed.filter((h) => h.upDown !== null);
  const upDownMade = upDownTries.filter((h) => h.upDown === true).length;
  const missShort = missed.filter((h) => missDirectionOf(h.missCell) === 'short').length;

  return {
    rounds: rounds.length,
    girPct: avg(rounds.map((r) => r.stats.girPct)),
    firPct: avg(rounds.map((r) => r.stats.firPct)),
    threePuttsPerRound: sum(rounds.map((r) => r.stats.threePutts)) / n,
    penaltiesPerRound: sum(rounds.map((r) => r.stats.penalties)) / n,
    upDownPct: upDownTries.length ? (upDownMade / upDownTries.length) * 100 : 0,
    missShortPct: missed.length ? (missShort / missed.length) * 100 : 0,
    dominantMiss: dominantMiss(missed.map((h) => h.missCell)),
  };
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
function avg(xs: number[]): number {
  return xs.length ? sum(xs) / xs.length : 0;
}
