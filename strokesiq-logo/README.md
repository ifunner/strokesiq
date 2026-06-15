# StrokesIQ — Logo & Brand Assets

StrokesIQ is a golf intelligence & performance analytics platform — sibling
brand to GreenIQ and PracticeIQ. The logomark (direction A2) is a simplified
strokes-gained chart: a zero baseline with one loss below and two gains above,
the biggest gain flagged in flag-yellow.

## Files

| File | Use |
|---|---|
| `mark.svg` | Logomark for **dark** surfaces (transparent bg) |
| `mark-light.svg` | Logomark for **light** surfaces |
| `mark-mono.svg` | Single-color, inherits `currentColor` — tint via CSS |
| `favicon.svg` | Scalable favicon (felt-green rounded square) |
| `favicon-32.png`, `favicon-16.png` | Raster favicons, corners baked |
| `icon-512.png`, `icon-192.png` | PWA icons, `purpose: any` (full-bleed square) |
| `icon-maskable-512.png`, `icon-maskable-192.png` | PWA icons, `purpose: maskable` (mark inside 80% safe zone) |
| `apple-touch-icon.png` | 180×180, iOS applies its own rounding |
| `lockup-dark.png`, `lockup-light.png` | Mark + wordmark, 924×236 — fine up to ~300px display width |

## Brand palette (shared across the …IQ family)

```css
--felt:         #0E2A22;  /* primary dark background, theme_color */
--felt-deep:    #0A201A;  /* deepest background, background_color */
--ivory:        #F2EBDA;  /* baseline / text on dark */
--fairway:      #46C98A;  /* gain bars, "IQ" accent — dark surfaces only */
--yellow:       #F4D03F;  /* the ONE pop: biggest-gain bar, use sparingly */
--fairway-deep: #1F8F5F;  /* fairway equivalent on light surfaces */
--yellow-deep:  #D9AE1B;  /* yellow equivalent on light surfaces */
```

## Wordmark

Typeface: **Space Grotesk** (Google Fonts), `letter-spacing: -0.03em`.
"Strokes" at weight 500 in ivory (or felt on light bg); "IQ" at weight 700 in
fairway green, pulled in `-0.11em` so it reads as one word. Prefer this
live-HTML lockup over the PNGs in-app:

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
<div style="display:flex;align-items:center;gap:0.46em;font-family:'Space Grotesk',sans-serif;
            font-size:32px;letter-spacing:-0.03em;line-height:1">
  <img src="/strokesiq-logo/mark.svg" alt="" style="width:1.42em;height:1.42em">
  <span><span style="font-weight:500;color:#F2EBDA">Strokes</span><span
    style="font-weight:700;color:#46C98A;margin-left:-0.11em">IQ</span></span>
</div>
```

## manifest.webmanifest

```json
{
  "theme_color": "#0E2A22",
  "background_color": "#0A201A",
  "icons": [
    { "src": "/strokesiq-logo/icon-192.png",          "sizes": "192x192", "type": "image/png" },
    { "src": "/strokesiq-logo/icon-512.png",          "sizes": "512x512", "type": "image/png" },
    { "src": "/strokesiq-logo/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/strokesiq-logo/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## <head>

```html
<link rel="icon" href="/strokesiq-logo/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/strokesiq-logo/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/strokesiq-logo/apple-touch-icon.png">
<meta name="theme-color" content="#0E2A22">
```

## Rules

- Clear space around the mark ≥ the height of the yellow bar. Minimum mark size
  22px; use `favicon.svg` for tab-size contexts.
- Fairway green and flag yellow on dark felt only; on light surfaces use the
  deep shades (already baked into `mark-light.svg`).
- Yellow is reserved for the single biggest-gain bar — never decoration.
- Don't rotate the mark, add bars, reorder the bars, recolor the baseline, add
  shadows/gradients, or set the wordmark in another typeface.

## Family note

StrokesIQ pairs with GreenIQ (breaking putt) and PracticeIQ (logbook): shared
palette, shared Space Grotesk "…IQ" wordmark logic, yellow as the one pop. Used
together they read as one GolfIQ product family.
