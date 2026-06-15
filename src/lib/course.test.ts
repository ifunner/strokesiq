import { describe, it, expect } from 'vitest';
import { buildCourse, teeNameFromLabel } from './course';
import { holeYdsFromCourse, buildRound } from './sg/round';
import type { Hole } from './sg/types';

function pars(): (3 | 4 | 5)[] {
  // A realistic-ish layout with four par 5s and four par 3s = par 72.
  return [4, 5, 4, 3, 4, 4, 5, 3, 4, 4, 5, 4, 3, 4, 4, 5, 3, 4];
}

describe('buildCourse', () => {
  it('sums par and builds a "<tee> · <par>" label', () => {
    const c = buildCourse({ name: 'Glen Abbey', teeName: 'Blue', holePars: pars(), holeYds: new Array(18).fill(0) });
    expect(c.tees[0].par).toBe(72);
    expect(c.tees[0].label).toBe('Blue · 72');
  });

  it('keeps yardage only on par-5 holes and zeroes the rest', () => {
    const holeYds = new Array(18).fill(999); // pretend everything got a number
    const c = buildCourse({ name: 'X', teeName: 'Blue', holePars: pars(), holeYds });
    const stored = c.tees[0].holeYds!;
    stored.forEach((y, i) => {
      if (pars()[i] === 5) expect(y).toBe(999);
      else expect(y).toBe(0);
    });
  });

  it('generates an id and trims names', () => {
    const c = buildCourse({ name: '  Eagles Nest  ', teeName: ' White ', holePars: pars(), holeYds: new Array(18).fill(0) });
    expect(c.id).toBeTruthy();
    expect(c.name).toBe('Eagles Nest');
    expect(c.tees[0].label).toBe('White · 72');
  });

  it('preserves an existing id when editing', () => {
    const c = buildCourse({ id: 'fixed', name: 'X', teeName: 'B', holePars: pars(), holeYds: new Array(18).fill(0) });
    expect(c.id).toBe('fixed');
  });
});

describe('teeNameFromLabel', () => {
  it('extracts the tee name from a label', () => {
    expect(teeNameFromLabel('Blue · 72')).toBe('Blue');
    expect(teeNameFromLabel('Championship · 73')).toBe('Championship');
  });
});

describe('par-5 yardage honesty (end-to-end)', () => {
  it('saved par-5 yardage changes driving SG vs the approximation', () => {
    const holePars = pars();
    const holeYds = holePars.map((p) => (p === 5 ? 540 : 0));
    const course = buildCourse({ name: 'X', teeName: 'Blue', holePars, holeYds });
    const map = holeYdsFromCourse(course, course.tees[0].label);
    expect(map).toBeDefined();

    // Hole 2 is a par 5.
    const par5: Hole = {
      number: 2,
      par: 5,
      score: 5,
      teeResult: 'fairway',
      driveYds: 270,
      approachYds: 230, // long second → engine's fallback would underestimate hole length
      missCell: 'green',
      gir: true,
      lie: null,
      upDown: null,
      firstPuttFt: 25,
      putts: 2,
      penalties: 0,
    };

    const withYds = buildRound({
      courseId: course.id,
      courseName: 'X',
      tee: course.tees[0].label,
      coursePar: 72,
      date: '2026-06-11',
      holes: [par5],
      holeYdsByNumber: map,
    });
    const withoutYds = buildRound({
      courseId: null,
      courseName: 'X',
      tee: 'B',
      coursePar: 72,
      date: '2026-06-11',
      holes: [par5],
    });

    expect(withYds.sg.driving).not.toBeCloseTo(withoutYds.sg.driving, 2);
  });
});
