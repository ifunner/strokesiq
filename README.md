# StrokesIQ

A golf-intelligence PWA in the GolfIQ suite. It answers one question:
**where did my strokes go, and what do I practice next?**

StrokesIQ scores every shot against **strokes gained** (Level 2: driving,
approach, short game, putting), names your biggest leak, and projects your
**Scoring Potential**. Local-first, offline, installable — no account, no server.

See [`docs/StrokesIQ-build-spec.md`](docs/StrokesIQ-build-spec.md) for the full
product spec and [`docs/strokesiq-prototype.html`](docs/strokesiq-prototype.html)
for the original visual reference.

## Tech

- **Vite 6 + TypeScript** (vanilla, no UI framework) — small bundle, fast on cellular
- **IndexedDB** via [`idb`](https://github.com/jakearchibald/idb) for local-first storage
- **vite-plugin-pwa** (Workbox) for offline app-shell caching + install
- **Vitest** for the strokes-gained engine and storage tests

## Project layout

```
src/
  lib/
    sg/         strokes-gained engine, expected-strokes tables, types, tests
    storage/    IndexedDB adapter + JSON backup/restore (shapes mirror future Supabase)
    copy/       dynamic leak + recommendation templates (the future "AI review" seam)
  components/   sgBars, dispersionPad cells, handicap sheet, brand icons
  views/        Home, NewRound, HoleEntry, RoundReview, Rounds, More
  store.ts      in-memory state + live-round draft
  app.ts        shell: router, tab bar, header
public/icons/   PWA icons (copied from strokesiq-logo/)
```

The engine in `src/lib/sg/` has **zero UI dependencies** and is the load-bearing
module — start there when changing how strokes are valued.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run dev:host   # expose on your LAN to test install on a phone
```

## Test & build

```bash
npm test           # Vitest (engine + storage)
npm run typecheck  # tsc --noEmit
npm run build      # tsc + vite build → dist/  (also writes 404.html for SPA fallback)
```

## Deploy (GitHub Pages)

Push to `main`; the workflow in `.github/workflows/deploy.yml` runs tests,
builds, and deploys. `vite.config.ts` derives the Pages base path from
`GITHUB_REPOSITORY`, so the repo name (`strokesiq`) sets the URL automatically.

Install + offline require HTTPS — open the published `https://…` URL in Safari
(iOS) or Chrome (Android), then **Add to Home Screen**.

## Back up your data

iOS can evict an unused web app's storage. **More → Export backup** saves a JSON
file; **Import backup** restores it (merge or replace) and is also how you move
data between devices.

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

## Roadmap (architected for, not built)

Supabase auth + sync (storage shapes are ready), golf-course API lookup, official
handicap tracking, LLM-generated round reviews (replacing `lib/copy/`),
PracticeIQ handoff, GreenIQ putting import, and optional Level 3 shot-by-shot.
