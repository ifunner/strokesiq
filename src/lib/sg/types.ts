/**
 * StrokesIQ data model — TypeScript types are the source of truth.
 * The Supabase schema (future sync) mirrors these shapes exactly.
 * UI must never couple directly to storage; it talks to these types.
 */

export type Lie = 'fairway' | 'rough' | 'sand' | 'recovery';
export type TeeResult = 'fairway' | 'left' | 'right' | 'penalty';

/** 3x3 dispersion pad. 'green' = GIR. Others encode miss direction. */
export type MissCell =
  | 'green'
  | 'S'
  | 'L'
  | 'left'
  | 'right'
  | 'SL'
  | 'SR'
  | 'LL'
  | 'LR';

export type CategoryKey = 'driving' | 'approach' | 'short' | 'putting';
export type CategorySG = Record<CategoryKey, number>;

export interface Hole {
  number: number; // 1..18
  par: 3 | 4 | 5;
  score: number;

  // Tee (par 4/5 only; null on par 3 — the tee shot IS the approach)
  teeResult: TeeResult | null;
  driveYds: number | null;

  // Approach
  approachYds: number; // distance to pin before the approach shot
  missCell: MissCell; // encodes GIR (=== 'green') AND miss direction
  gir: boolean; // derived: missCell === 'green'

  // Short game (only when !gir)
  lie: Lie | null;
  upDown: boolean | null; // made up-and-down? null when gir

  // Putting
  firstPuttFt: number; // distance of first putt; 0 if not applicable
  putts: number; // total putts on the hole

  penalties: number; // attributed to category by context (see engine)
}

export interface RoundStats {
  putts: number;
  girPct: number; // 0..100
  firPct: number; // 0..100 (fairways hit, par 4/5 only)
  penalties: number;
  threePutts: number;
  vsPar: number;
}

export interface Round {
  id: string;
  courseId: string | null;
  courseName: string;
  tee: string; // label, e.g. "Blue · 73"
  coursePar: number;
  date: string; // ISO
  holes: Hole[];
  // computed + cached at save time:
  sg: CategorySG; // negative = lost
  stats: RoundStats;
  biggestLeak: CategoryKey;
  /** A round counts toward rolling trends only when it has >= MIN_COUNTING_HOLES holes. */
  complete: boolean;
}

export interface CourseTee {
  label: string;
  par: number;
  holePars: (3 | 4 | 5)[];
  /** Per-hole yardage (decision Q4=A) — enables honest par-5 driving SG. */
  holeYds?: number[];
}

export interface Course {
  id: string;
  name: string;
  tees: CourseTee[];
}

export interface Profile {
  handicap: number; // default 14; drives the baseline
  units: 'imperial' | 'metric'; // metric deferred for MVP; kept in shape
  /** Set false until the user completes first-run handicap capture. */
  onboarded: boolean;
}

export const CATEGORY_ORDER: CategoryKey[] = [
  'driving',
  'approach',
  'short',
  'putting',
];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  driving: 'Driving',
  approach: 'Approach',
  short: 'Short game',
  putting: 'Putting',
};
