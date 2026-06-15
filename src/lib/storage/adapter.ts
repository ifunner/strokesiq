/**
 * Local-first storage adapter. IndexedDB for MVP; the shapes mirror the future
 * Supabase schema so sync can be layered on without touching the UI.
 *
 * The UI imports only this module's functions — never `idb` or `Round` storage
 * details directly — so the backend can be swapped later.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Course, Profile, Round } from '../sg/types';

const DB_NAME = 'strokesiq';
const DB_VERSION = 1;
const PROFILE_KEY = 'me';

interface StrokesIQDB extends DBSchema {
  profile: { key: string; value: Profile & { id: string } };
  courses: { key: string; value: Course };
  rounds: { key: string; value: Round; indexes: { 'by-date': string } };
}

const DEFAULT_PROFILE: Profile = {
  handicap: 14,
  units: 'imperial',
  onboarded: false,
};

let dbPromise: Promise<IDBPDatabase<StrokesIQDB>> | null = null;

function getDB(): Promise<IDBPDatabase<StrokesIQDB>> {
  if (!dbPromise) {
    dbPromise = openDB<StrokesIQDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('courses')) {
          db.createObjectStore('courses', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('rounds')) {
          const rounds = db.createObjectStore('rounds', { keyPath: 'id' });
          rounds.createIndex('by-date', 'date');
        }
      },
    });
  }
  return dbPromise;
}

// --- Profile ---

export async function getProfile(): Promise<Profile> {
  const db = await getDB();
  const stored = await db.get('profile', PROFILE_KEY);
  if (!stored) return { ...DEFAULT_PROFILE };
  const { id: _id, ...profile } = stored;
  return profile;
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await getDB();
  await db.put('profile', { ...profile, id: PROFILE_KEY });
}

// --- Courses ---

export async function getCourses(): Promise<Course[]> {
  const db = await getDB();
  return db.getAll('courses');
}

export async function getCourse(id: string): Promise<Course | undefined> {
  const db = await getDB();
  return db.get('courses', id);
}

export async function saveCourse(course: Course): Promise<void> {
  const db = await getDB();
  await db.put('courses', course);
}

export async function deleteCourse(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('courses', id);
}

// --- Rounds ---

export async function getRounds(): Promise<Round[]> {
  const db = await getDB();
  const rounds = await db.getAllFromIndex('rounds', 'by-date');
  return rounds.reverse(); // newest first
}

export async function getRound(id: string): Promise<Round | undefined> {
  const db = await getDB();
  return db.get('rounds', id);
}

export async function saveRound(round: Round): Promise<void> {
  const db = await getDB();
  await db.put('rounds', round);
}

export async function deleteRound(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('rounds', id);
}

// --- Backup / restore (iOS can evict PWA storage) ---

export interface Backup {
  app: 'strokesiq';
  version: number;
  exportedAt: string;
  profile: Profile;
  courses: Course[];
  rounds: Round[];
}

export async function exportBackup(): Promise<Backup> {
  const [profile, courses, rounds] = await Promise.all([
    getProfile(),
    getCourses(),
    getRounds(),
  ]);
  return {
    app: 'strokesiq',
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
    courses,
    rounds,
  };
}

export type ImportMode = 'merge' | 'replace';

export async function importBackup(
  backup: Backup,
  mode: ImportMode = 'merge',
): Promise<{ courses: number; rounds: number }> {
  if (backup.app !== 'strokesiq') {
    throw new Error('Not a StrokesIQ backup file.');
  }
  const db = await getDB();

  if (mode === 'replace') {
    const tx = db.transaction(['courses', 'rounds'], 'readwrite');
    await tx.objectStore('courses').clear();
    await tx.objectStore('rounds').clear();
    await tx.done;
  }

  if (backup.profile) await saveProfile(backup.profile);

  const tx = db.transaction(['courses', 'rounds'], 'readwrite');
  for (const c of backup.courses ?? []) await tx.objectStore('courses').put(c);
  for (const r of backup.rounds ?? []) await tx.objectStore('rounds').put(r);
  await tx.done;

  return {
    courses: backup.courses?.length ?? 0,
    rounds: backup.rounds?.length ?? 0,
  };
}

/** Test-only: close + reset the cached connection (used by fake-indexeddb suites). */
export async function _resetForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}
