import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  getProfile,
  saveProfile,
  saveCourse,
  getCourses,
  saveRound,
  getRounds,
  getRound,
  deleteRound,
  exportBackup,
  importBackup,
  _resetForTests,
} from './adapter';
import { buildRound } from '../sg/round';
import type { Hole } from '../sg/types';

function holes(n: number): Hole[] {
  return Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    par: 4,
    score: 5,
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
  }));
}

function wipe(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase('strokesiq');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  // Close any open connection, then drop the database for a clean slate.
  await _resetForTests();
  await wipe();
});

describe('profile', () => {
  it('returns the default profile before anything is saved', async () => {
    const p = await getProfile();
    expect(p.handicap).toBe(14);
    expect(p.onboarded).toBe(false);
  });

  it('persists profile changes', async () => {
    await saveProfile({ handicap: 9, units: 'imperial', onboarded: true });
    const p = await getProfile();
    expect(p.handicap).toBe(9);
    expect(p.onboarded).toBe(true);
  });
});

describe('courses', () => {
  it('saves and lists courses', async () => {
    await saveCourse({
      id: 'c1',
      name: 'Glen Abbey',
      tees: [{ label: 'Blue · 73', par: 72, holePars: [] }],
    });
    const list = await getCourses();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Glen Abbey');
  });
});

describe('rounds', () => {
  it('saves, reads, and deletes a round', async () => {
    const r = buildRound({
      courseId: null,
      courseName: 'Glen Abbey',
      tee: 'Blue · 73',
      coursePar: 72,
      date: '2026-06-11',
      holes: holes(18),
    });
    await saveRound(r);
    expect(await getRound(r.id)).toBeDefined();
    await deleteRound(r.id);
    expect(await getRound(r.id)).toBeUndefined();
  });

  it('returns rounds newest-first', async () => {
    const base = { courseId: null, courseName: 'X', tee: 'B', coursePar: 72 };
    await saveRound(buildRound({ ...base, date: '2026-06-01', holes: holes(18) }));
    await saveRound(buildRound({ ...base, date: '2026-06-15', holes: holes(18) }));
    await saveRound(buildRound({ ...base, date: '2026-06-08', holes: holes(18) }));
    const list = await getRounds();
    expect(list.map((r) => r.date)).toEqual(['2026-06-15', '2026-06-08', '2026-06-01']);
  });

  it('marks a 9-hole round as not counting but still stores it', async () => {
    const r = buildRound({
      courseId: null,
      courseName: 'Nine',
      tee: 'B',
      coursePar: 36,
      date: '2026-06-20',
      holes: holes(9),
    });
    expect(r.complete).toBe(true); // 9 >= MIN_COUNTING_HOLES
    const short = buildRound({
      courseId: null,
      courseName: 'Five',
      tee: 'B',
      coursePar: 20,
      date: '2026-06-21',
      holes: holes(5),
    });
    expect(short.complete).toBe(false);
    await saveRound(short);
    expect((await getRounds()).length).toBe(1);
  });
});

describe('backup', () => {
  it('round-trips export then import (replace)', async () => {
    await saveProfile({ handicap: 7, units: 'imperial', onboarded: true });
    await saveRound(
      buildRound({ courseId: null, courseName: 'A', tee: 'B', coursePar: 72, date: '2026-06-11', holes: holes(18) }),
    );
    const backup = await exportBackup();
    expect(backup.rounds).toHaveLength(1);

    // wipe and re-import
    await _resetForTests();
    await wipe();
    const res = await importBackup(backup, 'replace');
    expect(res.rounds).toBe(1);
    expect((await getProfile()).handicap).toBe(7);
    expect((await getRounds()).length).toBe(1);
  });

  it('rejects a foreign backup file', async () => {
    await expect(
      importBackup({ app: 'other' } as never, 'merge'),
    ).rejects.toThrow();
  });
});
