# StrokesIQ — Build Specification

A golf intelligence PWA for the GolfIQ suite. Answers one question: *where did my strokes go, and what do I practice next?* This spec is written to hand to Cursor alongside `strokesiq-prototype.html` (the visual + interaction reference) and the GolfIQ design system.

Status: MVP. Analytics depth is **Level 2** (broad strokes gained). Architecture must leave room for the future roadmap without building it.

---

## 1. Locked product decisions

| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Analytics level | **Level 2** — true SG for driving, approach, putting + penalty/short-game attribution | Credible "SG Approach −1.8," not a guess |
| 2 | Distances | **Required per hole**: driving distance, approach distance, first-putt distance | The engine can't value shots without them |
| 3 | When entered | **After each hole** (hole-by-hole card) | Keeps distances accurate vs. end-of-round recall |
| 4 | Baseline | **Self-reported handicap (default 14)**, SG vs scratch; auto-refines | Scratch is the industry standard; relative gap names the leak |
| 5 | Trend window | Single-round SG shown instantly; **headline leak + prescription gated behind 3+ rounds** (rolling 5) | One round is too noisy to prescribe from |
| 6 | Hero metric | **Scoring Potential** (projected score) | Motivating, not scolding |
| 7 | Navigation | **Home / Rounds / More** (3 tabs) | GolfIQ restraint; StrokesIQ owns scored-round history |
| 8 | PracticeIQ handoff | **Not in MVP.** Biggest-leak card is diagnostic only | Removed per current scope; revisit when PracticeIQ exposes an intent API |

---

## 2. Information architecture

```
Home (dashboard)
  ├─ Scoring Potential hero
  ├─ New round  (primary CTA)
  ├─ Biggest leak  (rolling 5, gated ≥3 rounds)
  ├─ Strokes gained by category (rolling 5)
  ├─ Supporting stats (putts, GIR, fairways, penalties)
  └─ Last round → Round Review

New round → Hole Entry (×18) → Round Review

Rounds (history)
  └─ row → Round Review

More
  ├─ How StrokesIQ works
  ├─ Starting handicap (also reachable from header pill)
  └─ GolfIQ suite
```

Header handicap pill is tappable everywhere and opens the handicap sheet.

---

## 3. Data model

TypeScript types are the source of truth; the Supabase schema mirrors them. Local-first for MVP (IndexedDB / a `storage` adapter), with the same shapes ready to sync to Supabase later — do **not** couple UI to Supabase directly.

```ts
type Lie = 'fairway' | 'rough' | 'sand' | 'recovery';
type TeeResult = 'fairway' | 'left' | 'right' | 'penalty';
// 3×3 dispersion pad. 'green' = GIR. Others = miss direction.
type MissCell = 'green' | 'S' | 'L' | 'left' | 'right' | 'SL' | 'SR' | 'LL' | 'LR';

interface Hole {
  number: number;            // 1..18
  par: 3 | 4 | 5;
  score: number;

  // Tee (par 4/5 only; null on par 3 — the tee shot IS the approach)
  teeResult: TeeResult | null;
  driveYds: number | null;

  // Approach
  approachYds: number;       // distance to pin before the approach shot
  missCell: MissCell;        // encodes GIR (=== 'green') AND miss direction
  gir: boolean;              // derived: missCell === 'green'

  // Short game (only when !gir)
  lie: Lie | null;           // lie of the around-green shot
  upDown: boolean | null;    // made up-and-down? null when gir

  // Putting
  firstPuttFt: number;       // distance of first putt; 0 if green missed AND not holed out off green
  putts: number;             // total putts on the hole

  penalties: number;         // 0,1,2... attributed to category by context (see engine)
}

interface Round {
  id: string;
  courseId: string | null;
  courseName: string;
  tee: string;               // label, e.g. "Blue · 73"
  coursePar: number;
  date: string;              // ISO
  holes: Hole[];
  // computed + cached at save time:
  sg: CategorySG;            // { driving, approach, short, putting }  (negative = lost)
  stats: RoundStats;         // putts, girPct, firPct, penalties, threePutts, vsPar
  biggestLeak: CategoryKey;
}

interface Course {                 // saved course remembers its pars
  id: string;
  name: string;
  tees: { label: string; par: number; holePars: (3|4|5)[] }[];
}

interface Profile {
  handicap: number;          // default 14; drives the baseline
  units: 'imperial' | 'metric';
}

type CategoryKey = 'driving' | 'approach' | 'short' | 'putting';
type CategorySG = Record<CategoryKey, number>;
```

### Supabase schema (future sync, same shapes)

```sql
create table profiles (
  user_id uuid primary key references auth.users,
  handicap numeric not null default 14,
  units text not null default 'imperial'
);
create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text not null,
  tees jsonb not null            -- [{label, par, holePars}]
);
create table rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  course_id uuid references courses(id),
  course_name text not null,
  tee text not null,
  course_par int not null,
  played_on date not null,
  sg jsonb not null,             -- {driving,approach,short,putting}
  stats jsonb not null,
  biggest_leak text not null
);
create table holes (
  round_id uuid references rounds(id) on delete cascade,
  number int not null,
  par int not null,
  score int not null,
  tee_result text,
  drive_yds int,
  approach_yds int not null,
  miss_cell text not null,
  gir boolean not null,
  lie text,
  up_down boolean,
  first_putt_ft int not null,
  putts int not null,
  penalties int not null default 0,
  primary key (round_id, number)
);
```

---

## 4. The strokes-gained engine

This is the load-bearing module. Put it in `lib/sg/` with zero UI dependencies and unit tests. The prototype's `holeSG` is a working sketch; harden it as below.

### 4.1 Expected-strokes tables (scratch baseline)

Replace the prototype's approximations with the full published Broadie expected-strokes-to-hole-out grids (PGA Tour / scratch). You need:

- `eTee(yards)` — par 4/5 tee shot
- `eFairway(yards)`, `eRough(yards)`, `eSand(yards)`, `eRecovery(yards)` — approach by lie
- `eAroundGreen(yards)` — inside ~30 yds (short game)
- `ePutt(feet)` — putting

All are 1-D lookups with linear interpolation (`interp` in the prototype is fine). Store tables as `[distance, expected][]`. Clamp inputs to table bounds.

### 4.2 Per-shot SG

`SG = E_start − (1 + E_end)`, with each shot attributed to a category:

```ts
function holeSG(h: Hole, courseHoleYds?: number): CategorySG {
  const sg = { driving: 0, approach: 0, short: 0, putting: 0 };
  const inFairway = h.teeResult === 'fairway';

  // --- Tee (par 4/5) ---
  if (h.par >= 4) {
    const startYds = teeStartYards(h, courseHoleYds);     // see 4.3
    const endLie = inFairway ? eFairway(h.approachYds) : eRough(h.approachYds);
    sg.driving = eTee(startYds) - (1 + endLie);
    if (h.teeResult === 'penalty') sg.driving -= 1;       // tee penalty → driving
  }

  // --- Approach ---
  const apStart = h.par === 3
    ? eTee(h.approachYds)                                  // par 3: tee shot is the approach
    : (inFairway ? eFairway(h.approachYds) : eRough(h.approachYds));
  const apEnd = h.gir ? ePutt(h.firstPuttFt) : eAroundGreen(MISSED_GREEN_DEFAULT_YDS);
  sg.approach = apStart - (1 + apEnd);

  // --- Short game (only when green missed) ---
  if (!h.gir) {
    const sgStart = (h.lie === 'sand' ? eSand : h.lie === 'fairway' ? eFairway : eRough)(MISSED_GREEN_DEFAULT_YDS);
    const sgEnd = ePutt(h.firstPuttFt > 0 ? h.firstPuttFt : 6);  // assume ~6ft if not captured
    sg.short = sgStart - (1 + sgEnd);
  }

  // --- Putting ---  (first putt valued cleanly; extra putts fold in as negative)
  sg.putting = ePutt(h.firstPuttFt) - h.putts;

  // remaining penalties (not tee) attributed to approach
  const nonTeePens = h.penalties - (h.teeResult === 'penalty' ? 1 : 0);
  if (nonTeePens > 0) sg.approach -= nonTeePens;

  return sg;
}
```

`CategorySG` for a round = element-wise sum across holes. `biggestLeak` = the most-negative key.

### 4.3 Edge cases — decide these explicitly

These are the spots where Level-2 data is incomplete; the rule chosen affects accuracy:

- **Par 5 hole length / layup.** Level 2 captures driving distance and the *final* approach distance but not the middle (layup) shot. `teeStartYards` options: (a) use the saved course hole yardage if available (preferred — add `holeYds` to `Course.tees`), (b) approximate `drive + approach + 150`. The third shot's SG currently folds into driving/approach. **Recommended:** capture course hole yardage so par-5 driving SG is honest; flag par-5 numbers as approximate until then.
- **Missed-green end distance.** When `!gir`, we don't store how far off the green the ball finished. `MISSED_GREEN_DEFAULT_YDS ≈ 12`. Acceptable for MVP; the dispersion direction still drives the *coaching* copy even though magnitude is approximate.
- **Chip-ins / holed from off the green.** `putts === 0` is legal. Then `ePutt(firstPuttFt)` shouldn't apply; treat the holed shot as ending the hole and credit short game. Allow `putts` min = 0; if 0, skip the putting term and add the saved stroke to short game.
- **Penalty attribution.** Tee penalty → driving (flagged by `teeResult === 'penalty'`). Any other penalty → approach. If you later want approach-vs-driving precision, add an optional "where did the penalty happen" tap; not MVP.
- **Baseline / handicap.** MVP computes SG vs **scratch** regardless of handicap, so all categories read negative and the *most* negative is the leak — this is correct and matches Arccos/Shot Scope. Handicap drives **Scoring Potential** copy and will later shift the reference table. Store handicap; recompute Scoring Potential on change.

### 4.4 Scoring Potential (hero)

```
avgScore     = mean(last 5 rounds' score)
worstLeak    = mean SG of the biggest-leak category over last 5 rounds   (negative)
potential    = round(avgScore + worstLeak * RECOVERABLE_FRACTION)
RECOVERABLE_FRACTION ≈ 0.7   // you won't fully close the gap; promise what's realistic
```

Copy: *"You're a {avgScore} leaving {avgScore − potential} strokes on the course."* Never show a potential below the player's best round.

---

## 5. Screen specs & conditional rules

### 5.1 Home

- **Hero** uses `.card.read`, mono potential in `--flag`, supporting `Avg score / SG per round / Rounds` row.
- **Biggest leak** card is **gated**: with `< 3` rounds, show an empty state instead — *"Log {3 − n} more rounds and StrokesIQ will call your biggest leak."* Don't prescribe from noise.
- Leak copy is **dynamic per category** (see prototype `leakCopy`). Each of the four categories has its own diagnostic template. Pull the supporting numbers (miss %, three-putts, up-and-down %) from the rolling window, not hardcoded.
- SG-by-category uses diverging bars: center zero line, red left for losses, green right for gains, value in mono.

### 5.2 Hole entry — conditional display (the rules you flagged)

Render cards top to bottom: **Hole/Par/Score → Tee → Approach → Putting → Short game → Penalty**, with these rules:

| Condition | Behavior |
|---|---|
| `par === 3` | **Hide the Tee card.** The tee shot is the approach; `driveYds = null`. |
| Dispersion = center (`green`) → **GIR** | Tag reads "On the green · GIR" in `--path`. **Hide the Short game card** (no lie, no up-and-down — there is no up-and-down on a green you hit). |
| Dispersion = any miss → **not GIR** | Tag reads the direction in `--red`. **Show Short game card**: `Lie` (Rough/Fairway/Sand) + `Up & down` (Made/Missed). Sand lie is how sand saves are captured — no separate field. |
| Putting | First-putt distance and total putts are **two full-width steppers, stacked** (never a 2-col grid — that's what clipped the numbers). |
| Putts | min 0 (allows chip-ins). If 0, hide/skip first-putt distance. |

**Navigation:** a horizontal scrollable hole strip (1–18) above the form. Current hole = `--flag`; completed holes carry a `--path` dot; tap any number to jump (saving the current hole first). Keep Prev/Next as well. Last hole's Next button reads "Finish round →".

State pattern (from prototype): one `cur` object per hole, persisted into `holes[n]` on navigate; `loadHole` restores saved values and re-syncs every control (steppers, par pick, dispersion pad, segments).

### 5.3 Round review

- Score summary (`.card.read`, 3-col): Score / vs par / Putts / GIR / Fairways / Penalties.
- SG-by-category for **this round** (same diverging bars).
- **Miss pattern**: 3×3 heat grid from the round's `missCell` counts; red opacity ∝ count, center = greens hit in `--path`. Caption summarizes the dominant bias ("9 of 13 misses finished short").
- **Practice this next**: dynamic per worst category (prototype `reviewRec`). Diagnostic + a concrete next-session suggestion. No external handoff in MVP.

### 5.4 Handicap sheet

Modal (`.modal` scrim + `.sheet`), stepper 0–36, Save writes `Profile.handicap`, toasts "Baseline updated," and triggers a recompute of Scoring Potential. Reachable from the header pill and from More.

---

## 6. Component architecture

```
App
├─ Header (brand, HandicapPill→HandicapSheet)
├─ Router (Home | NewRound | HoleEntry | RoundReview | Rounds | More)
├─ TabBar (Home | Rounds | More)
│
├─ Home
│  ├─ ScoringPotentialHero
│  ├─ PrimaryCTA "New round"
│  ├─ BiggestLeakCard      (gated; consumes leakCopy)
│  ├─ SGCategoryBars        (shared)
│  ├─ StatGrid
│  └─ LastRoundRow
├─ NewRound (CourseField+chips, TeeSegmented, DateField)
├─ HoleEntry
│  ├─ HoleStrip            (nav)
│  ├─ ParPicker, ScoreStepper
│  ├─ TeeCard              (hidden when par 3)
│  ├─ ApproachCard → DispersionPad   ← signature component
│  ├─ PuttingCard          (stacked steppers)
│  ├─ ShortGameCard        (shown only when !gir)
│  └─ PenaltySegmented
├─ RoundReview (ScoreSummary, SGCategoryBars, MissHeatGrid, RecommendationCard)
├─ Rounds (RoundRow list)
└─ More (Accordion items, HandicapSheet)

Shared: SGCategoryBars, DispersionPad, Stepper, Segmented, Card, Verdict, Modal/Sheet, Toast
lib/sg/  (engine + tables + tests)   lib/storage/ (adapter)   lib/copy/ (leak + rec templates)
```

`DispersionPad` and `SGCategoryBars` are the two components worth building well and reusing; everything else is thin.

---

## 7. Design system compliance

Inherit GolfIQ tokens verbatim (`--felt`, `--panel`, `--ink`, `--flag`, `--path`, `--red`, `--line`, `--r: 16px`, etc.), Space Grotesk for UI, mono for all data. Rules that matter most here:

- **One pop color.** `--flag` only on: Scoring Potential, primary CTA, active tab, current hole, dispersion-green-when-hit. Never decorative.
- **SG color semantics.** Gained = `--path`; lost/leak = `--red`. Leak badges use the red number-badge variant.
- Cards 16px radius with the inset highlight + soft shadow; buttons 11px; `scale(.96)` press; `pgin` page enter; respect `prefers-reduced-motion`.
- 520px max column, safe-area insets, fixed blurred tab bar, portrait PWA.

---

## 8. What the prototype stubs (implement for real)

1. **Persist the live round.** Finishing currently jumps to a seeded review. Wire `holes[]` → `holeSG` → `Round` → storage → render the actual review.
2. **Full Broadie tables** in `lib/sg/` (prototype tables are approximated).
3. **Par-5 hole yardage** so driving SG is honest (add `holeYds` to courses).
4. **Gating logic** for the biggest-leak headline (≥3 rounds) and rolling-5 windows.
5. **Real miss-pattern counts** feeding the heat grid (prototype is seeded short-biased).
6. **Handicap → Scoring Potential recompute** (prototype only updates the label).
7. **Onboarding** one-question handicap capture on first run (defaults to 14 otherwise).
8. **Course save** persisting `holePars` so replays pre-fill par.

---

## 9. Future roadmap — architect for, don't build

Supabase auth + sync (shapes above are ready), golf-course APIs (replace free-text course with lookup), official handicap tracking, AI round reviews (the leak/rec copy becomes an LLM call over the round JSON), PracticeIQ handoff (export biggest leak as a practice-intent payload), GreenIQ putting import, and a move toward Level 3 shot-by-shot if users want it. None gated behind MVP; none coupled into the UI layer.
