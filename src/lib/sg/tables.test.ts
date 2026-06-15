import { describe, it, expect } from 'vitest';
import {
  interp,
  E_PUTT,
  E_FAIRWAY,
  E_TEE,
  eFairway,
  ePutt,
  eRough,
  eSand,
} from './tables';

describe('interp', () => {
  it('clamps below the first control point', () => {
    expect(interp(E_PUTT, 0)).toBe(E_PUTT[0][1]);
    expect(interp(E_PUTT, -5)).toBe(E_PUTT[0][1]);
  });

  it('clamps above the last control point', () => {
    const last = E_PUTT[E_PUTT.length - 1];
    expect(interp(E_PUTT, last[0] + 100)).toBe(last[1]);
  });

  it('returns exact values at control points', () => {
    for (const [x, y] of E_FAIRWAY) {
      expect(interp(E_FAIRWAY, x)).toBeCloseTo(y, 6);
    }
  });

  it('interpolates linearly between points', () => {
    // halfway between [100,2.80] and [120,2.85] => 2.825
    expect(eFairway(110)).toBeCloseTo(2.825, 3);
  });
});

describe('table sanity', () => {
  it('putting is monotonically non-decreasing with distance', () => {
    for (let i = 1; i < E_PUTT.length; i++) {
      expect(E_PUTT[i][1]).toBeGreaterThanOrEqual(E_PUTT[i - 1][1]);
    }
  });

  it('1-foot putt is essentially a tap-in', () => {
    expect(ePutt(1)).toBeCloseTo(1.0, 2);
  });

  it('rough is harder than fairway at the same distance', () => {
    for (let d = 60; d <= 240; d += 20) {
      expect(eRough(d)).toBeGreaterThan(eFairway(d));
    }
  });

  it('sand is harder than fairway for short approaches', () => {
    expect(eSand(40)).toBeGreaterThan(eFairway(40));
  });

  it('tee expected strokes rise for longer holes', () => {
    expect(interp(E_TEE, 500)).toBeGreaterThan(interp(E_TEE, 300));
  });
});
