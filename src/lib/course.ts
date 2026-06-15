import type { Course } from './sg/types';

export function makeCourseId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface CourseDraft {
  id?: string;
  name: string;
  teeName: string; // short tee name, e.g. "Blue"
  holePars: (3 | 4 | 5)[]; // length 18
  /** length 18; 0 = unknown. We only capture yardage on par-5 holes (decision). */
  holeYds: number[];
}

/** Build a persistable Course from the setup-screen draft. */
export function buildCourse(d: CourseDraft): Course {
  const par = d.holePars.reduce((a, b) => a + b, 0);
  const teeName = d.teeName.trim() || 'Tee';
  const label = `${teeName} · ${par}`;
  // Normalize yardages: keep par-5 yardages, zero everything else.
  const holeYds = d.holePars.map((p, i) => (p === 5 ? d.holeYds[i] || 0 : 0));
  return {
    id: d.id ?? makeCourseId(),
    name: d.name.trim() || 'Unnamed course',
    tees: [{ label, par, holePars: d.holePars, holeYds }],
  };
}

/** Parse the short tee name back out of a stored label like "Blue · 72". */
export function teeNameFromLabel(label: string): string {
  const idx = label.indexOf(' · ');
  return idx >= 0 ? label.slice(0, idx) : label;
}
