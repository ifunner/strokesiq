# GolfIQ Design System

The GolfIQ design language is built for golf tools that feel like premium course-side instruments: dark felt greens, warm ivory type, and a single flag-yellow accent for the moments that matter (aim point, cup, primary action). **GreenIQ** is the reference implementation; **PracticeIQ** and other suite apps follow the same tokens, hierarchy, and component rules documented here.

---

## Design principles

1. **Instrument, not decoration** — UI reads like a caddie’s yardage book: dense data, clear hierarchy, no visual noise.
2. **One pop color** — Flag yellow (`--flag`) is reserved for aim, cup, and primary CTAs. Never use it as ambient decoration.
3. **Mobile-first, thumb-zone aware** — Single-column layout, fixed tab bar, safe-area insets, max width 520px.
4. **Data is monospace** — Measurements, percentages, and scores use tabular mono numerals; labels and navigation use Space Grotesk.
5. **Offline-ready calm** — Dark surfaces, subtle depth, minimal motion. Respects `prefers-reduced-motion`.

---

## Colors

### CSS custom properties

All tokens live on `:root` (GreenIQ: `styles.css`; suite apps: inline in `index.html` or shared stylesheet).

| Token | Hex | Role |
|---|---|---|
| `--felt` | `#0E2A22` | Primary surface, PWA `theme_color` |
| `--felt-deep` | `#0A201A` | Deepest background, stepper wells, bar tracks |
| `--panel` | `#10322A` | Card and sheet backgrounds |
| `--panel-hi` | `#143a30` | Default button fill, elevated panel |
| `--ink` | `#F2EBDA` | Primary text (ivory) |
| `--ink-dim` | `#9DB3A6` | Secondary text, hints, inactive tabs |
| `--sage` | `#6E8F7E` | Labels, eyebrows, tertiary UI |
| `--line` | `#26483D` | Borders, dividers, dial ticks |
| `--flag` | `#F4D03F` | **Accent** — aim, cup, primary buttons, active tab |
| `--path` | `#46C98A` | Ball path, success/live states, “IQ” wordmark |
| `--red` | `#E06A5C` | Warnings, miss states, pattern badge |
| `--uphill` | `#7FC8FF` | Supplementary accent (finger read hint) |

### Brand aliases (logo / light surfaces)

From `greeniq-logo/README.md`:

| Alias | Hex | Notes |
|---|---|---|
| `--ivory` | `#F2EBDA` | Same as `--ink` |
| `--fairway` | `#46C98A` | Same as `--path`; dark surfaces only |
| `--yellow` | `#F4D03F` | Same as `--flag` |
| `--fairway-deep` | `#1F8F5F` | Fairway on light backgrounds |
| `--yellow-deep` | `#D9AE1B` | Yellow on light backgrounds |

### Semantic usage

| Meaning | Color |
|---|---|
| Primary action | `--flag` on `#1a1500` text |
| Live / success / made putt | `--path` on `#04140c` text |
| Warning / over-read / miss | `--red` |
| Locked sensor reading | `--flag` (bubble) |
| Live sensor | `--path` (bubble) |
| Idle sensor | `--sage` (bubble) |
| Aim values & hero metrics | `--flag` |
| Ball trajectory | `--path` |
| Fall line / downhill arrow | `--sage` |

### Background treatment

The page background is a **single, gradual radial gradient** over `--felt-deep`. The effect should read as a soft top-light that slowly deepens over the full viewport — never as a visible band or horizontal cut-off behind the header or first card.

**Canonical recipe:**

```css
html { background: var(--felt-deep); }

body {
  min-height: 100vh;
  background-color: var(--felt-deep);
  background-image: radial-gradient(
    120% 95% at 50% -10%,
    #16382d 0%,
    var(--felt) 52%,
    var(--felt-deep) 100%
  );
  background-attachment: fixed;
}
```

| Property | Value | Why |
|---|---|---|
| Ellipse width | `120%` | Wide, even wash across the column |
| Ellipse height | `95%` | Tall falloff — gradient spans most of the viewport |
| Origin | `50% -10%` | Light source above the viewport top |
| Highlight | `#16382d` | Slightly lifted green; do not go brighter |
| Mid stop | `var(--felt)` at `52%` | Holds mid-tone longer before deepening |
| Base | `var(--felt-deep)` at `100%` | Anchors bottom and tab-bar zone |
| Attachment | `fixed` | Pins gradient to the viewport on scroll |

**Do not:**

- Stack multiple gradients (radial + linear) — causes banding and hard edges
- Use more than three color stops on the page background
- Paint the header with a solid `--felt-deep` scrim — it creates a prominent dark line over the gradient
- Let the radial complete to `--felt-deep` too early (keep height ≥ `90%`)

GreenIQ header scrolls with content (`background: transparent`). Suite apps may use `position: sticky` on the header, but the header background must stay **transparent** so the page gradient shows through.

Special card variant `.read` (GreenIQ) / `.metric.hero` (PracticeIQ) uses a darker inset gradient:

```css
background: linear-gradient(180deg, #0c2820, #0a221b);
border-color: #2c5446;
```

### Overlays

| Element | Value |
|---|---|
| Modal scrim | `rgba(5, 16, 12, 0.74)` + `backdrop-filter: blur(3px)` |
| Tab bar | `rgba(9, 26, 21, 0.92)` + `backdrop-filter: blur(14px)` |
| Card inset highlight | `0 1px 0 rgba(255,255,255,.025) inset` |
| Card shadow | `0 8px 24px -18px #000` |

### On-color text pairings

| Background | Text |
|---|---|
| `--flag` | `#1a1500` |
| `--path` | `#04140c` |
| `--panel` / `--felt-deep` | `--ink` or `--ink-dim` |

---

## Typography

### Font stacks

| Role | Family | Weights loaded |
|---|---|---|
| **Display / UI** | `'Space Grotesk', ui-sans-serif, system-ui, sans-serif` | 500, 700 |
| **Data / metrics** | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` | — |
| **Suite data (PracticeIQ)** | `'JetBrains Mono', ui-monospace, monospace` | 400, 500, 700 — **numbers only** |
| **Fallback body** | `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | — |

Space Grotesk applies to: `.brand h1`, `.card h2`, `summary`, `.tabbar button`, `.sect`, `.eyebrow`, `label.f`, nav labels.

Monospace applies to: `.mono`, stepper inputs, `.readout-slope`, `.bigval`, chips’ numeric values, insight stats, timers, counters, dates. **Do not** set structural labels, section titles, or nav text in mono.

### Type scale

| Class / element | Size | Weight | Tracking | Transform | Color |
|---|---|---|---|---|---|
| `.brand h1` | 21px | 500 / 700 split | −0.028em | — | `--ink` / `--path` |
| `.pill` | 10px | 800 | 0.16em | uppercase | `--felt-deep` on `--flag` |
| `.eyebrow` | 11px | 600 | 0.22em | uppercase | `--sage` |
| `.card h2` | 13px | (700 via summary) | 0.04em | — | `--ink` |
| `.card h2 .num` | 12px | mono | — | — | `--flag` |
| `.readout-slope` | 40px (+ 18px unit) | 600 | −0.02em | — | `--ink` / `--ink-dim` |
| `.bigval` | 34px (+ 15px unit) | 600 | −0.02em | — | `--ink` or `--flag` in `.aimcol` |
| Body / `.acc-body` | 13px | 400 | — | — | `--ink-dim` |
| `.hint` | 11.5px | 400 | — | — | `--ink-dim` |
| `.callout` | 13–15px | 600 | — | — | `--ink` |
| `.subline` | 12px | 400 | — | — | `--ink-dim` |
| `.field label` | 11px | 600 | 0.04em | uppercase | `--sage` |
| `button` | 13px | 600 | — | — | `--ink` |
| `.tabbar button` | 10.5px | 700 | 0.04em | — | `--ink-dim` / `--flag` when `.on` |
| `.sheet h3` | 16px | default | — | — | `--ink` |
| `footer` | 11px | 400 | — | — | `--sage` |

### Wordmark

```
Green  →  Space Grotesk 500, color: --ink
IQ     →  Space Grotesk 700, color: --path
```

Letter-spacing: `−0.028em`. Prefer live HTML/SVG lockup over raster logos.

### Numeric conventions

- Use `font-variant-numeric: tabular-nums` on `.mono`.
- Slope: one decimal + `%`.
- Aim/pace: one decimal in imperial; metric rounds to whole cm where shown.
- Percentages in insights: whole numbers.

---

## Spacing

### Base rhythm

The layout uses a **4px implicit grid** with common steps at 6, 8, 9, 10, 11, 12, 13, 14, 15, 18px.

| Token / pattern | Value | Usage |
|---|---|---|
| `--r` | `16px` | Default border radius (cards, accordions) |
| Body horizontal padding | `14px` | Page gutters |
| Body top padding | `max(14px, safe-area-inset-top)` | Notch-aware |
| Body bottom padding | `86px + safe-area-inset-bottom` | Clears fixed tab bar |
| Card padding | `15px` | Standard card interior |
| Card margin-bottom | `13px` | Stack gap between cards |
| `.btnrow` gap | `8px` | Button groups |
| `.grid2` gap | `10px` | Two-column form fields |
| Header margin-bottom | `14px` | Below brand row |
| Section internal gaps | `11–14px` | Reader, clock, schematic blocks |

### Component-specific spacing

| Component | Padding / gap |
|---|---|
| Button default | `9px 12px` |
| Button small (header) | `5px 10px` |
| Tab bar | `6px 8px` + bottom safe area |
| Tab item | `7px 0`, icon gap `3px` |
| Stepper side buttons | `38px` wide |
| Stepper input | `10px 0` vertical |
| Chip | `6px 11px`, gap `7px` |
| Modal sheet | `18px` |
| Accordion summary | `14px 15px` |
| Accordion body | `0 15px 15px` |
| Verdict callout | `10px 12px` |
| Toast | `10px 16px` |

### Layout width

```css
max-width: 520px;
margin: 0 auto;
```

Portrait-only PWA (`manifest.webmanifest`: `"orientation": "portrait"`).

---

## Buttons

### Base

```css
font: inherit;
cursor: pointer;
border-radius: 11px;
border: 1px solid var(--line);
background: var(--panel-hi);
color: var(--ink);
padding: 9px 12px;
font-size: 13px;
font-weight: 600;
transition: transform 0.04s ease, background 0.15s, border-color 0.15s;
```

**Active press:** `transform: scale(0.96)`.

### Variants

| Class | Background | Border | Text | Use |
|---|---|---|---|---|
| *(default)* | `--panel-hi` | `--line` | `--ink` | Secondary actions |
| `.primary` | `--flag` | `--flag` | `#1a1500` | Main CTA per section |
| `.live` | `--path` | `--path` | `#04140c` | Sensor active state |
| `.ghost` | `transparent` | `--line` | `--ink` | Tertiary, cancel, toggle off |
| `.sm` | — | — | — | Compact padding: `5px 10px`; use with any variant |
| `.made` (log row) | default | `#2c5446` | `--path` | Successful putt log |

### Button groups (`.btnrow`)

```css
display: flex;
gap: 8px;
flex-wrap: wrap;
margin-top: 11px;
```

Grain selector and card footers use `.btnrow` with one `.primary` selected, others `.ghost`.

### Segmented control (`.seg`)

Inline toggle for mutually exclusive options (e.g. inches vs fingers):

```css
display: inline-flex;
border: 1px solid var(--line);
border-radius: 9px;
overflow: hidden;
```

Segment buttons: no border radius, `padding: 6px 11px`, `font-size: 12px`. Active (`.on`): `--flag` background, `#1a1500` text.

### Stepper buttons

Nested inside `.stepper` — borderless, `38px` wide, `font-size: 19px`, color `--sage`, no border-radius.

---

## Cards

### Standard card (`.card`)

```css
background: linear-gradient(180deg, var(--panel) 0%, var(--panel) 100%);
border: 1px solid var(--line);
border-radius: var(--r); /* 16px */
padding: 15px;
margin-bottom: 13px;
box-shadow:
  0 1px 0 rgba(255,255,255,.025) inset,
  0 8px 24px -18px #000;
```

**Section header (`.card h2`):**

- Flex row, `gap: 8px`, `margin-bottom: 12px`
- Optional numbered badge (`.num`): mono, `--flag` text, `1px` border `--line`, `border-radius: 6px`, `padding: 2px 6px`
- Alternate badges use semantic colors (patterns = `--red`, trainer = `--path`, feel = `--uphill`)

### Hero read card (`.card.read`)

Darker treatment to elevate “Your read” above setup cards. Aim column (`.aimcol`) tints `.bigval` with `--flag`.

### Accordion (native `<details>`)

Card-like container with expandable body:

- Same border/radius as cards
- Summary: `font-size: 13px`, `font-weight: 700`, `padding: 14px 15px`
- Expand indicator: `+` / `–` in `--sage`, monospace, `18px`
- Body: `line-height: 1.62`, `--ink-dim` with `<b>` in `--ink`

### Modal sheet (`.sheet`)

Floating card inside modal:

- `border-radius: 18px` (slightly larger than `--r`)
- `padding: 18px`
- `max-width: 380px`

---

## Forms

### Field structure (`.field`)

```html
<div class="field">
  <label>Label <span class="u-inline">(unit)</span></label>
  <!-- control -->
</div>
```

- Label: uppercase sage, `11px`, `letter-spacing: 0.04em`
- `.u-inline`: normal case, `--ink-dim`, weight 500 — for units in parentheses

### Stepper (numeric input)

Primary numeric control pattern:

```
[ − ] [ centered mono value ] [ + ]
```

```css
.stepper {
  display: flex;
  border: 1px solid var(--line);
  border-radius: 11px;
  overflow: hidden;
  background: var(--felt-deep);
}
```

Input: centered mono, `17px`, weight 600, no focus outline (custom UI). Hidden `.unit` span for semantics.

### Range slider

```css
input[type=range] {
  width: 100%;
  accent-color: var(--flag);
  margin: 6px 0 0;
}
```

Used for: manual slope, trainer guess, feel trainer guess.

### Text input (inline)

Course name uses stepper shell with left-aligned text: `font-size: 14px`, `padding-left: 12px`.

### Chip selectors (`.chips` / `.chip`)

Saved course pills — selectable, dismissible:

```css
.chip {
  font-size: 12px;
  font-weight: 600;
  background: var(--felt-deep);
  border: 1px solid var(--line);
  border-radius: 99px;
  padding: 6px 11px;
}
```

Numeric value in chip: mono, `--flag`. Dismiss `×`: `--ink-dim`.

### Form layout

- Two-up fields: `.grid2` (`1fr 1fr`, gap `10px`, `min-width: 0` on children)
- Full-width fields below grid with `margin-top: 11px`

---

## Navigation

### Fixed tab bar (`.tabbar`)

Bottom navigation for primary app sections (Read · Train · More):

| Property | Value |
|---|---|
| Position | `fixed`, bottom, full width, `z-index: 40` |
| Max width | `520px`, centered |
| Background | `rgba(9,26,21,.92)` + 14px blur |
| Border | `1px solid var(--line)` top |
| Safe area | `padding-bottom: calc(8px + env(safe-area-inset-bottom))` |

**Tab button:**

- Column layout: icon (`21×21` SVG, stroke `1.9`, round caps) + label
- Default: `--ink-dim`
- Active (`.on`): `--flag`
- No background fill; `border-radius: 12px`

### Page switching (`.page`)

- Only one `.page.on` visible at a time
- Switching scrolls to top
- Entry animation: `pgin` 0.18s ease (see Animations)

### Header

- Brand lockup left (mark + wordmark)
- Utility cluster right: unit toggle (`.ghost` small button) + `.pill` badge (GreenIQ)
- **GreenIQ:** scrolls with content, `background: transparent`
- **Suite apps (e.g. PracticeIQ):** may use `position: sticky; background: transparent` — never a solid `--felt-deep` overlay on the header

### In-card navigation

Secondary flows use ghost text buttons with arrow suffix (`Find green speed →`) rather than links.

---

## Animations

### Page enter

```css
@keyframes pgin {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: none; }
}
.page { animation: pgin 0.18s ease; }       /* GreenIQ */
.view-in { animation: pgin 0.18s ease; }  /* suite apps */
```

### Button press

`transform: scale(0.96)` on `:active` — 40ms ease.

### Toast

```css
.toast {
  position: fixed;
  left: 50%;
  bottom: calc(86px + env(safe-area-inset-bottom));
  transform: translateX(-50%) translateY(20px);
  background: var(--panel-hi);
  border: 1px solid var(--line);
  color: var(--ink);
  font-weight: 600;
  font-size: 13px;
  padding: 10px 16px;
  border-radius: 99px;
  opacity: 0;
  transition: 0.25s;
}
.toast.on {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
```

Auto-dismiss ~1.6s. Do not use `--flag` or `--path` for toast fills — toasts are neutral chrome, not primary actions.

### Blur reveal (Feel Trainer)

`.blurred { filter: blur(12px); transition: filter 0.2s; }` — hides live readout until user commits a guess.

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  .page { animation: none; }
  * { transition: none !important; }
}
```

### What not to animate

- Chart redraws (instant SVG replace)
- Tab bar (instant color swap)
- No looping or decorative motion

---

## Charts & data visualization

GreenIQ renders charts as **inline SVG** (no chart library). Follow these conventions for GolfIQ data views.

### Putt schematic (top-down read)

ViewBox: `320 × 220`. Dynamic scaling with padding: `padX 34`, `padTop 22`, `padBot 30`.

| Element | Stroke / fill | Width | Style |
|---|---|---|---|
| Center line | `--line` | 1 | dashed `3 5` |
| Ball path | `--path` | 2.6 | round caps/joins |
| Start line / aim | `--flag` | 1.4 | dashed `2 4`, opacity 0.85 |
| Fall line (downhill) | `--sage` | 2 | arrow marker |
| Hole ring | `--ink` | 2 | fill none, r=6.2 |
| Hole center | `--ink` | — | r=2 fill |
| Aim point | `--flag` | — | r=4.5 fill |
| Ball | `#fff` | — | r=4.5 fill |
| Labels | `--sage` / `--flag` / `--ink-dim` | — | `font-size: 9` |

**Legend (`.legend`):** 9×9px swatches, `border-radius: 2px`, `11px` `--ink-dim` labels.

### Level bubble (slope gauge)

ViewBox: `128 × 128`. Concentric circles and crosshairs in `--line` on `#0a1f19` fill. Bubble color reflects state:

| State | Bubble color |
|---|---|
| Locked | `--flag` |
| Live sensor | `--path` |
| Manual / idle | `--sage` |

Bubble: r=9, opacity 0.9, white ring at 25% opacity.

### Direction clock dial

ViewBox: `118 × 118`. 12 ticks, `--line` stroke 1.5. Center dot `--sage`. Direction arrow: `--flag`, stroke-width 3, round cap; endpoint circle r=6. Labels “HOLE” / “YOU” in `--ink-dim`, 8.5px.

### Insight bar charts (`.bar`)

Horizontal progress bars for make rates:

```css
.bar {
  height: 8px;
  background: var(--felt-deep);
  border: 1px solid var(--line);
  border-radius: 99px;
  overflow: hidden;
}
.bar i {
  display: block;
  height: 100%;
  background: var(--path);
  /* width set inline as percentage */
}
```

Paired with `.insight-line`: flex space-between, `12.5px`, label `--ink-dim`, value mono `--ink`.

### Verdict panel (`.verdict`)

Insight callout with accent rail:

```css
border: 1px solid var(--line);
border-left: 3px solid var(--flag);
border-radius: 8px;
font-size: 13px;
line-height: 1.5;
```

Use for actionable pattern diagnosis (miss bias, pace trends).

### Chart color rules

1. **One trajectory color** — `--path` for actual/simulated paths.
2. **Yellow = intent** — `--flag` for where to aim or start the ball.
3. **Sage = gravity** — fall lines, downhill indicators, chart annotations.
4. **Never rainbow** — max 3 hues per diagram plus neutrals.

---

## Layout patterns

### App shell

```
┌─────────────────────────────┐
│ Header (brand + utilities)  │
├─────────────────────────────┤
│                             │
│  .page (scrollable content) │
│    └─ stacked .card sections│
│                             │
├─────────────────────────────┤
│ .tabbar (fixed)             │
└─────────────────────────────┘
```

### Numbered workflow cards (Read tab)

Sequential cards `1 → 2 → 3` guide setup, then a hero `.read` card outputs aim + pace + schematic. Number badges reinforce order without a stepper UI.

### Split readout grids

| Pattern | Grid | Left | Right |
|---|---|---|---|
| `.reader` | `128px 1fr` | Level gauge SVG | Slope % + direction |
| `.clockwrap` | `118px 1fr` | Direction dial | Help text |
| `.readgrid` | `1fr 1fr` | Aim column (`.aimcol`) | Pace column |

Eyebrow label → `.bigval` → `.subline` → `.callout` forms a consistent metric stack.

### Trainer flow (state machine in a card)

Each trainer card cycles **Idle → Quiz → Result** via `display: none/block`:

- Idle: hint copy + single `.primary` CTA + stats hint
- Quiz: scenario + segmented format + range input + primary/ghost actions
- Result: `.readgrid` comparison + verdict `.callout` + next/done buttons

### Log row (`.logrow`)

Full-width label, then equal-width buttons in a flex row — optimized for quick thumb logging after a putt.

### Modal pattern

Full-viewport `.modal` flex-centers `.sheet`. Scrim click or ghost cancel closes. Primary action applies data then dismisses.

### More tab

Accordion-only content — no tab bar sub-nav. Footer disclaimer below last accordion.

---

## Border radius reference

| Element | Radius |
|---|---|
| Cards, accordions | `16px` (`--r`) |
| Buttons | `11px` |
| Stepper | `11px` |
| Tab bar items | `12px` |
| Modal sheet | `18px` |
| Pills, toast, chips, bars | `99px` (full) |
| Number badge | `6px` |
| Segmented control | `9px` |
| Legend swatch | `2px` |
| Verdict | `8px` |

---

## Icons

- **Tab bar:** 24×24 viewBox, stroke-only, no fill, `stroke-width: 1.9`, round caps/joins.
- **Brand mark:** Breaking putt arc (`--path`), cup ring (`--ink`), pin dot (`--flag`), ball dot (`--ink`). Do not rotate, shadow, or recolor outside brand rules.
- **Minimum mark size:** 20px; clear space ≥ ball diameter (12% of mark width).

---

## Accessibility & platform

| Concern | Implementation |
|---|---|
| Safe areas | `env(safe-area-inset-*)` on body and tab bar |
| Theme color | `#0A201A` (HTML meta) / `#0E2A22` (manifest) |
| Tap highlight | `-webkit-tap-highlight-color: transparent` |
| Font smoothing | `-webkit-font-smoothing: antialiased` |
| Overscroll | `overscroll-behavior-y: none` on `html, body` |
| Touch | Clock dial: `touch-action: none`; pointer events for drag |
| Motion | Respects `prefers-reduced-motion` |
| PWA | Standalone, portrait, offline via service worker |

---

## File reference

| File | Design responsibility |
|---|---|
| `styles.css` | Tokens, components, layout (GreenIQ) |
| `index.html` | Structure, font loading, semantic sections |
| `app.js` | SVG chart generation, dynamic states (GreenIQ) |
| `greeniq-logo/` | Brand palette, mark rules, PWA icons |
| `manifest.webmanifest` | Theme/background colors, orientation |
| `practiceiq/index.html` | PracticeIQ tokens, components, layout (inline styles) |
| `practiceiq-logo/` | PracticeIQ mark, lockups, PWA icons |
| `DESIGN_SYSTEM.md` | Cross-suite design spec (this file) |

---

## Suite app notes

### PracticeIQ

Implements the full token set and component hierarchy in a single `index.html`. Deviations from GreenIQ are intentional product choices, not spec exceptions:

| Area | PracticeIQ |
|---|---|
| Tabs | 5 items (Today · Practice · Rounds · Plan · More) |
| Header | Sticky, transparent — gradient must show through |
| Data font | JetBrains Mono for metrics; Space Grotesk for labels |
| Hero metric | `.metric.hero` uses `.read` card gradient |
| Accent rail | `.cue` banner — flag-yellow left border (swing thought) |
| Category pills | Semantic tinted `.pill` variants (speed / putt / score) |
| Primary CTA | `.btn.primary` on save, start, and done actions |

---

## Quick start for new GolfIQ surfaces

1. Copy `:root` tokens from `styles.css` (or PracticeIQ `index.html`).
2. Load Space Grotesk (500, 700) from Google Fonts.
3. Apply the canonical page background (see **Background treatment**): `html` + `body` with fixed radial gradient; transparent header.
4. Stack content in `.card` sections inside a 520px column.
5. Put primary actions in `.btn.primary`; keep yellow scarce.
6. Render measurements in mono; labels in uppercase sage eyebrows (Space Grotesk).
7. Anchor navigation in a blurred `.tabbar` with safe-area padding; active tab uses `--flag`.
8. Draw data as SVG using `--path`, `--flag`, and `--sage` semantics.
