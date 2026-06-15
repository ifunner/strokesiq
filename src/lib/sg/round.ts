import {
  roundSG,
  biggestLeak,
  computeRoundStats,
  MIN_COUNTING_HOLES,
} from './engine';
import type { Course, Hole, Round } from './types';

export interface BuildRoundInput {
  id?: string;
  courseId: string | null;
  courseName: string;
  tee: string;
  coursePar: number;
  date: string; // ISO
  holes: Hole[];
  /** Per-hole yardages indexed by hole number (from the saved course tee). */
  holeYdsByNumber?: Record<number, number | undefined>;
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Resolve per-hole yardages from a saved course tee, if available. */
export function holeYdsFromCourse(
  course: Course | null,
  teeLabel: string,
): Record<number, number | undefined> | undefined {
  if (!course) return undefined;
  const tee = course.tees.find((t) => t.label === teeLabel);
  if (!tee?.holeYds) return undefined;
  const map: Record<number, number | undefined> = {};
  tee.holeYds.forEach((yds, i) => {
    map[i + 1] = yds;
  });
  return map;
}

/** Assemble a persistable Round from entered holes, computing + caching SG. */
export function buildRound(input: BuildRoundInput): Round {
  const holes = input.holes.slice().sort((a, b) => a.number - b.number);
  const sg = roundSG(holes, input.holeYdsByNumber);
  const stats = computeRoundStats(holes, input.coursePar);
  return {
    id: input.id ?? makeId(),
    courseId: input.courseId,
    courseName: input.courseName,
    tee: input.tee,
    coursePar: input.coursePar,
    date: input.date,
    holes,
    sg,
    stats,
    biggestLeak: biggestLeak(sg),
    complete: holes.length >= MIN_COUNTING_HOLES,
  };
}
