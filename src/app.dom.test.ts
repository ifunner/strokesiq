// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';

import {
  loadAll,
  startDraft,
  saveHole,
  loadCurrentHole,
  gotoHole,
  finishDraft,
  getState,
  type DraftMeta,
} from './store';
import { HomeView } from './views/home';
import { RoundsView } from './views/rounds';
import { MoreView } from './views/more';
import { NewRoundView } from './views/newRound';
import { RoundReviewView } from './views/roundReview';
import { HoleEntryView } from './views/holeEntry';
import { initApp } from './app';
import { _resetForTests } from './lib/storage/adapter';

function wipe(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase('strokesiq');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  await _resetForTests(); // close any cached connection so deleteDatabase won't block
  await wipe();
  document.body.innerHTML = '';
});

const META: DraftMeta = {
  courseId: null,
  courseName: 'Glen Abbey',
  tee: 'Blue · 73',
  coursePar: 72,
  date: '2026-06-11',
  holePars: Array.from({ length: 18 }, () => 4 as const),
};

describe('view rendering (empty state)', () => {
  it('renders all top-level views without throwing', async () => {
    await loadAll();
    for (const view of [HomeView, RoundsView, MoreView, NewRoundView]) {
      const el = view();
      expect(el).toBeInstanceOf(HTMLElement);
      expect(el.querySelector('*')).toBeTruthy();
    }
  });

  it('home shows an empty scoring-potential hero before any rounds', async () => {
    await loadAll();
    const el = HomeView();
    expect(el.querySelector('.pot')?.textContent).toBe('—');
  });

  it('hole entry without a draft renders a safe empty state', async () => {
    await loadAll();
    const el = HoleEntryView();
    expect(el.textContent).toContain('No round in progress');
  });

  it('round review with an unknown id renders a safe empty state', async () => {
    await loadAll();
    const el = RoundReviewView('nope');
    expect(el.textContent).toContain('Round not found');
  });
});

describe('full round flow', () => {
  it('starts a draft, enters 18 holes, finishes, and reviews', async () => {
    await loadAll();
    startDraft(META, 18);

    for (let n = 1; n <= 18; n++) {
      // Render the live hole-entry screen for each hole (catches per-hole render bugs).
      const page = HoleEntryView();
      expect(page).toBeInstanceOf(HTMLElement);
      const hole = loadCurrentHole();
      // Vary the data a little so SG and miss-pattern aren't degenerate.
      if (n % 3 === 0) {
        hole.missCell = 'S';
        hole.gir = false;
        hole.lie = 'rough';
        hole.upDown = false;
        hole.putts = 2;
        hole.score = 5;
      }
      saveHole(hole);
      if (n < 18) gotoHole(n + 1);
    }

    const id = await finishDraft();
    expect(id).toBeTruthy();

    const rounds = getState().rounds;
    expect(rounds).toHaveLength(1);
    expect(rounds[0].complete).toBe(true);

    // Home now shows a numeric potential and the gated leak card should be present.
    const home = HomeView();
    expect(home.querySelector('.pot')?.textContent).not.toBe('—');

    // Review renders with the saved id.
    const review = RoundReviewView(id);
    expect(review.textContent).toContain('Round review');
    expect(review.querySelector('.heat')).toBeTruthy();
    // Edit + delete controls exist.
    expect(review.querySelector('#edit')).toBeTruthy();
    expect(review.querySelector('#delete')).toBeTruthy();

    // Rounds list shows the round.
    const list = RoundsView();
    expect(list.querySelectorAll('.rrow').length).toBe(1);
  });
});

describe('app shell', () => {
  it('initApp mounts header, tab bar, and onboarding on first run', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    await initApp(root);

    expect(root.querySelector('.brand h1')?.textContent).toContain('Strokes');
    expect(root.querySelectorAll('.tabbar button').length).toBe(3);
    // First run is not onboarded → onboarding modal appended to body.
    expect(document.querySelector('.modal')).toBeTruthy();
  });
});
