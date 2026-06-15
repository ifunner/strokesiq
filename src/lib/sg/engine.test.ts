import { describe, it, expect } from 'vitest';
import {
  holeSG,
  roundSG,
  biggestLeak,
  computeRoundStats,
  scoringPotential,
  rollingCategorySG,
  teeStartYards,
  MISSED_GREEN_DEFAULT_YDS,
} from './engine';
import type { Hole, Round, CategorySG } from './types';

function par4(overrides: Partial<Hole> = {}): Hole {
  return {
    number: 1,
    par: 4,
    score: 4,
    teeResult: 'fairway',
    driveYds: 250,
    approachYds: 150,
    missCell: 'green',
    gir: true,
    lie: null,
    upDown: null,
    firstPuttFt: 20,
    putts: 2,
    penalties: 0,
    ...overrides,
  };
}

function par3(overrides: Partial<Hole> = {}): Hole {
  return {
    number: 7,
    par: 3,
    score: 3,
    teeResult: null,
    driveYds: null,
    approachYds: 165,
    missCell: 'green',
    gir: true,
    lie: null,
    upDown: null,
    firstPuttFt: 18,
    putts: 2,
    penalties: 0,
    ...overrides,
  };
}

describe('teeStartYards', () => {
  it('prefers saved course hole yardage', () => {
    expect(teeStartYards(par4(), 420)).toBe(420);
  });
  it('falls back to drive + approach on par 4', () => {
    expect(teeStartYards(par4({ driveYds: 250, approachYds: 150 }))).toBe(400);
  });
  it('adds a layup estimate on par 5 without yardage', () => {
    expect(
      teeStartYards(par4({ par: 5, driveYds: 270, approachYds: 120 })),
    ).toBe(270 + 120 + 150);
  });
});

describe('holeSG attribution', () => {
  it('par 3 has no driving SG (tee shot is the approach)', () => {
    const sg = holeSG(par3());
    expect(sg.driving).toBe(0);
    expect(sg.short).toBe(0); // green hit
  });

  it('par 3 missed green produces short-game SG and no driving SG', () => {
    const sg = holeSG(
      par3({ missCell: 'S', gir: false, lie: 'rough', upDown: false, firstPuttFt: 8, putts: 2, score: 4 }),
    );
    expect(sg.driving).toBe(0);
    expect(sg.short).not.toBe(0);
  });

  it('tee penalty is charged to driving', () => {
    const clean = holeSG(par4({ teeResult: 'fairway' }));
    const penal = holeSG(par4({ teeResult: 'penalty', penalties: 1, score: 6 }));
    expect(penal.driving).toBeLessThan(clean.driving);
  });

  it('non-tee penalty is charged to approach', () => {
    const clean = holeSG(par4());
    const penal = holeSG(par4({ penalties: 1, score: 5 }));
    expect(penal.approach).toBeCloseTo(clean.approach - 1, 6);
    expect(penal.driving).toBeCloseTo(clean.driving, 6);
  });

  it('missed green adds a non-zero short-game term', () => {
    const sg = holeSG(
      par4({ missCell: 'S', gir: false, lie: 'sand', upDown: false, firstPuttFt: 6, putts: 2, score: 5 }),
    );
    expect(sg.short).not.toBe(0);
  });

  it('chip-in (putts === 0) skips putting and credits short game', () => {
    const sg = holeSG(
      par4({ missCell: 'left', gir: false, lie: 'rough', upDown: true, firstPuttFt: 0, putts: 0, score: 4 }),
    );
    expect(sg.putting).toBe(0);
    expect(sg.short).not.toBe(0);
  });

  it('a clean par on a green hit nets near-neutral putting', () => {
    const sg = holeSG(par4({ firstPuttFt: 20, putts: 2 }));
    // ePutt(20) ~ 1.87, minus 2 putts => ~ -0.13
    expect(sg.putting).toBeLessThan(0);
    expect(sg.putting).toBeGreaterThan(-0.5);
  });

  it('three-putt is worse for putting than a two-putt from the same distance', () => {
    const two = holeSG(par4({ firstPuttFt: 30, putts: 2 }));
    const three = holeSG(par4({ firstPuttFt: 30, putts: 3, score: 5 }));
    expect(three.putting).toBeLessThan(two.putting);
    expect(three.putting).toBeCloseTo(two.putting - 1, 6);
  });

  it('uses MISSED_GREEN_DEFAULT_YDS for the short-game start lie', () => {
    // sanity: constant is exported and reasonable
    expect(MISSED_GREEN_DEFAULT_YDS).toBeGreaterThan(0);
    expect(MISSED_GREEN_DEFAULT_YDS).toBeLessThan(40);
  });
});

describe('roundSG + biggestLeak', () => {
  it('sums element-wise across holes', () => {
    const holes = [par4(), par4({ number: 2 }), par3()];
    const total = roundSG(holes);
    const manual = holes
      .map((h) => holeSG(h))
      .reduce(
        (acc, sg) => ({
          driving: acc.driving + sg.driving,
          approach: acc.approach + sg.approach,
          short: acc.short + sg.short,
          putting: acc.putting + sg.putting,
        }),
        { driving: 0, approach: 0, short: 0, putting: 0 } as CategorySG,
      );
    expect(total.driving).toBeCloseTo(manual.driving, 6);
    expect(total.approach).toBeCloseTo(manual.approach, 6);
  });

  it('picks the most-negative category', () => {
    expect(
      biggestLeak({ driving: -1, approach: -3.4, short: -0.5, putting: -1.2 }),
    ).toBe('approach');
  });

  it('uses per-hole yardage when provided', () => {
    const h = par4({ number: 4, driveYds: 250, approachYds: 150 });
    const withYds = roundSG([h], { 4: 470 });
    const withoutYds = roundSG([h]);
    expect(withYds.driving).not.toBeCloseTo(withoutYds.driving, 3);
  });
});

describe('computeRoundStats', () => {
  it('computes putts, GIR%, fairway%, three-putts and vs par', () => {
    const holes = [
      par4({ score: 5, gir: false, missCell: 'S', lie: 'rough', putts: 2, teeResult: 'left' }),
      par4({ number: 2, score: 4, putts: 2, teeResult: 'fairway' }),
      par3({ number: 3, score: 3, putts: 3 }), // three-putt, no tee shot
      par4({ number: 4, par: 5, score: 6, putts: 2, teeResult: 'fairway', driveYds: 270 }),
    ];
    const stats = computeRoundStats(holes, 72);
    expect(stats.putts).toBe(9);
    expect(stats.threePutts).toBe(1);
    expect(stats.girPct).toBe(75); // 3 of 4 greens
    // fairways: holes 2 & 4 hit, hole 1 missed → 2 of 3 par4/5 = 67%
    expect(stats.firPct).toBe(67);
    // played par = 4+4+3+5 = 16, score = 5+4+3+6 = 18 → +2 (partial round)
    expect(stats.vsPar).toBe(2);
  });
});

function makeRound(id: string, date: string, sg: CategorySG, score: number, complete = true): Round {
  return {
    id,
    courseId: null,
    courseName: 'Test',
    tee: 'Blue · 72',
    coursePar: 72,
    date,
    holes: [],
    sg,
    stats: { putts: 33, girPct: 28, firPct: 45, penalties: 1, threePutts: 2, vsPar: score - 72 },
    biggestLeak: biggestLeak(sg),
    complete,
  };
}

describe('scoringPotential', () => {
  it('returns null with no counting rounds', () => {
    expect(scoringPotential([])).toBeNull();
    const partial = makeRound('p', '2026-06-01', { driving: -2, approach: -3, short: -1, putting: -1 }, 90, false);
    expect(scoringPotential([partial])).toBeNull();
  });

  it('projects a potential below average but never below best round', () => {
    const rounds = [
      makeRound('a', '2026-06-01', { driving: -2, approach: -4, short: -1, putting: -1 }, 92),
      makeRound('b', '2026-06-08', { driving: -2, approach: -4, short: -1, putting: -1 }, 90),
    ];
    const sp = scoringPotential(rounds)!;
    expect(sp.leak).toBe('approach');
    expect(sp.potential).toBeLessThanOrEqual(sp.avgScore);
    expect(sp.potential).toBeGreaterThanOrEqual(sp.bestScore);
  });
});

describe('rollingCategorySG', () => {
  it('averages the most recent counting rounds within the window', () => {
    const rounds = [
      makeRound('a', '2026-05-01', { driving: -1, approach: -1, short: -1, putting: -1 }, 90),
      makeRound('b', '2026-05-08', { driving: -3, approach: -3, short: -3, putting: -3 }, 96),
      makeRound('c', '2026-05-15', { driving: -2, approach: -2, short: -2, putting: -2 }, 93),
    ];
    const avg = rollingCategorySG(rounds, 2)!;
    // two most recent: c (-2) and b (-3) → -2.5 each
    expect(avg.driving).toBeCloseTo(-2.5, 6);
    expect(avg.putting).toBeCloseTo(-2.5, 6);
  });

  it('ignores partial rounds', () => {
    const rounds = [
      makeRound('a', '2026-05-01', { driving: -1, approach: -1, short: -1, putting: -1 }, 90),
      makeRound('b', '2026-05-08', { driving: -5, approach: -5, short: -5, putting: -5 }, 99, false),
    ];
    const avg = rollingCategorySG(rounds)!;
    expect(avg.driving).toBeCloseTo(-1, 6);
  });
});
