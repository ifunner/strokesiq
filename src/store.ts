/** In-memory app state + live-round draft, backed by the storage adapter. */

import {
  getProfile,
  saveProfile,
  getRounds,
  saveRound,
  deleteRound,
  getCourses,
  saveCourse,
  deleteCourse as deleteCourseFromDb,
} from './lib/storage/adapter';
import { buildRound, holeYdsFromCourse } from './lib/sg/round';
import type {
  Course,
  Hole,
  Profile,
  Round,
} from './lib/sg/types';

export type Route =
  | { name: 'home' }
  | { name: 'newround' }
  | { name: 'hole' }
  | { name: 'review'; id: string }
  | { name: 'rounds' }
  | { name: 'more' }
  | { name: 'courseSetup'; id?: string; from?: 'newround' | 'more' };

export interface DraftMeta {
  courseId: string | null;
  courseName: string;
  tee: string;
  coursePar: number;
  date: string; // ISO date (yyyy-mm-dd)
  holePars: (3 | 4 | 5)[]; // 18 entries when known
  holeYdsByNumber?: Record<number, number | undefined>;
}

export interface Draft {
  meta: DraftMeta;
  holes: Map<number, Hole>;
  current: number;
  total: number;
}

interface State {
  profile: Profile;
  rounds: Round[];
  courses: Course[];
  route: Route;
  draft: Draft | null;
}

const state: State = {
  profile: { handicap: 14, units: 'imperial', onboarded: false },
  rounds: [],
  courses: [],
  route: { name: 'home' },
  draft: null,
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): void {
  listeners.add(fn);
}
function emit(): void {
  for (const fn of listeners) fn();
}

export function getState(): Readonly<State> {
  return state;
}

export async function loadAll(): Promise<void> {
  const [profile, rounds, courses] = await Promise.all([
    getProfile(),
    getRounds(),
    getCourses(),
  ]);
  state.profile = profile;
  state.rounds = rounds;
  state.courses = courses;
}

export function go(route: Route): void {
  state.route = route;
  emit();
  window.scrollTo(0, 0);
}

// --- Profile ---

export async function updateHandicap(handicap: number): Promise<void> {
  state.profile = { ...state.profile, handicap, onboarded: true };
  await saveProfile(state.profile);
  emit();
}

export async function completeOnboarding(handicap: number): Promise<void> {
  state.profile = { ...state.profile, handicap, onboarded: true };
  await saveProfile(state.profile);
  emit();
}

// --- Courses ---

export function getCourse(id: string): Course | undefined {
  return state.courses.find((c) => c.id === id);
}

export async function upsertCourse(course: Course): Promise<void> {
  await saveCourse(course);
  state.courses = await getCourses();
  emit();
}

export async function removeCourse(id: string): Promise<void> {
  await deleteCourseFromDb(id);
  state.courses = await getCourses();
  emit();
}

// --- Live round draft ---

export function makeDefaultHole(number: number, par: 3 | 4 | 5): Hole {
  return {
    number,
    par,
    score: par,
    teeResult: par === 3 ? null : 'fairway',
    driveYds: par === 3 ? null : 240,
    approachYds: par === 3 ? 160 : 150,
    missCell: 'green',
    gir: true,
    lie: null,
    upDown: null,
    firstPuttFt: 20,
    putts: 2,
    penalties: 0,
  };
}

export function startDraft(meta: DraftMeta, total = 18): void {
  state.draft = {
    meta,
    holes: new Map(),
    current: 1,
    total,
  };
}

export function getDraft(): Draft | null {
  return state.draft;
}

export function parForHole(number: number): 3 | 4 | 5 {
  const d = state.draft;
  const fromCourse = d?.meta.holePars?.[number - 1];
  return fromCourse ?? 4;
}

/** Get the working hole for the current index, restoring saved values. */
export function loadCurrentHole(): Hole {
  const d = state.draft!;
  const existing = d.holes.get(d.current);
  if (existing) return { ...existing };
  return makeDefaultHole(d.current, parForHole(d.current));
}

export function saveHole(hole: Hole): void {
  const d = state.draft!;
  d.holes.set(hole.number, { ...hole, gir: hole.missCell === 'green' });
}

export function gotoHole(n: number): void {
  const d = state.draft!;
  d.current = Math.max(1, Math.min(d.total, n));
  emit();
}

/** Build + persist the draft as a Round; clears the draft; returns the id. */
export async function finishDraft(): Promise<string> {
  const d = state.draft!;
  const holes = Array.from(d.holes.values()).sort(
    (a, b) => a.number - b.number,
  );
  const round = buildRound({
    id: editingId ?? undefined,
    courseId: d.meta.courseId,
    courseName: d.meta.courseName,
    tee: d.meta.tee,
    coursePar: d.meta.coursePar,
    date: new Date(d.meta.date).toISOString(),
    holes,
    holeYdsByNumber: d.meta.holeYdsByNumber,
  });
  editingId = null;
  await saveRound(round);
  state.rounds = await getRounds();
  state.draft = null;
  return round.id;
}

export function discardDraft(): void {
  state.draft = null;
}

// --- Round edit / delete ---

export async function removeRound(id: string): Promise<void> {
  await deleteRound(id);
  state.rounds = await getRounds();
  emit();
}

/** Re-open a saved round as an editable draft. */
export function editRound(round: Round): void {
  const meta: DraftMeta = {
    courseId: round.courseId,
    courseName: round.courseName,
    tee: round.tee,
    coursePar: round.coursePar,
    date: round.date.slice(0, 10),
    holePars: round.holes.map((h) => h.par),
    holeYdsByNumber: holeYdsFromCourse(
      state.courses.find((c) => c.id === round.courseId) ?? null,
      round.tee,
    ),
  };
  const holes = new Map<number, Hole>();
  for (const h of round.holes) holes.set(h.number, { ...h });
  state.draft = {
    meta,
    holes,
    current: 1,
    total: round.holes.length || 18,
  };
  // Editing replaces the same id on save.
  editingId = round.id;
}

let editingId: string | null = null;
