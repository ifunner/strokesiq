# StrokesIQ

A golf-intelligence PWA in the **GolfIQ suite**. It answers one question: **where did my strokes go, and what do I practice next?**

StrokesIQ scores every shot against **strokes gained** (driving, approach, short game, putting), names your **biggest leak**, and projects your **scoring potential**. Local-first, offline, installable — no account, no server.

**Live app → [ifunner.github.io/strokesiq](https://ifunner.github.io/strokesiq/)**

---

## What it does

Log a round hole by hole — distances, lies, misses — and StrokesIQ shows where you gained and lost strokes vs scratch. After a few rounds it calls your **biggest leak** (the category costing you the most) and your **scoring potential** (where your game is headed if trends hold).

Use it to decide what to practice next, not to stare at a spreadsheet. Imperial units for MVP; your data stays on your phone.

## GolfIQ suite

StrokesIQ is the **diagnosis side** of GolfIQ — where your strokes actually go.

- **[PracticeIQ](https://ifunner.github.io/practiceiq/)** — practice planner and session logger; builds routines around your leak.
- **[GreenIQ](https://ifunner.github.io/greeniq/)** — green reading and putting trainer; aim, pace, and feel on the practice green.

## Install on your phone

1. Open **[ifunner.github.io/strokesiq](https://ifunner.github.io/strokesiq/)** in Safari (iOS) or Chrome (Android).
2. Share → **Add to Home Screen**.
3. Launch from the home-screen icon — full-screen and offline after first load.

## Back up your data

iOS can evict an unused web app's storage. **More → Export backup** saves a JSON file; **Import backup** restores it (merge or replace) and moves data between devices.

## Key product decisions (MVP)

| Decision | Choice |
|---|---|
| Analytics level | Level 2 strokes gained vs scratch |
| Distances | Required per hole (drive, approach, first putt) |
| Par-5 driving SG | Honest when course hole yardage is saved; approximated otherwise |
| Biggest-leak headline | Gated behind 3+ counting rounds (rolling 5) |
| Round length | 9+ holes count toward trends; shorter rounds saved but excluded |
| First run | Empty state + one-question handicap onboarding (default 14) |
| Units | Imperial for MVP (metric deferred; shape retained) |
| Rounds | Editable and deletable |

---

## For developers

Vite 6 + TypeScript (vanilla, no UI framework). See [`docs/StrokesIQ-build-spec.md`](docs/StrokesIQ-build-spec.md) for the full product spec and [`docs/strokesiq-prototype.html`](docs/strokesiq-prototype.html) for the original visual reference.

### Tech

- **IndexedDB** via [`idb`](https://github.com/jakearchibald/idb) for local-first storage
- **vite-plugin-pwa** (Workbox) for offline app-shell caching + install
- **Vitest** for the strokes-gained engine and storage tests

### Project layout

```
src/
  lib/
    sg/         strokes-gained engine, expected-strokes tables, types, tests
    storage/    IndexedDB adapter + JSON backup/restore
    copy/       dynamic leak + recommendation templates
  components/   sgBars, dispersionPad cells, handicap sheet, brand icons
  views/        Home, NewRound, HoleEntry, RoundReview, Rounds, More
  store.ts      in-memory state + live-round draft
  app.ts        shell: router, tab bar, header
public/icons/   PWA icons (from strokesiq-logo/)
```

The engine in `src/lib/sg/` has **zero UI dependencies** — start there when changing how strokes are valued.

### Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run dev:host   # LAN — test install on a phone
```

### Test & build

```bash
npm test           # Vitest (engine + storage)
npm run typecheck  # tsc --noEmit
npm run build      # tsc + vite build → dist/
```

### Deploy (GitHub Pages)

Push to `main`; `.github/workflows/deploy.yml` runs tests, builds, and deploys. `vite.config.ts` sets the Pages base path from `GITHUB_REPOSITORY` (`/strokesiq/`).

Design tokens and cross-suite UI rules: [`golfiq-design`](https://github.com/ifunner/golfiq-design) · [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).

### Roadmap (architected for, not built)

Supabase auth + sync, golf-course API lookup, official handicap tracking, LLM-generated round reviews (replacing `lib/copy/`), PracticeIQ handoff, GreenIQ putting import, optional Level 3 shot-by-shot.
