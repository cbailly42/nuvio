# Nuvio: logo usage guide (one page)

> For anyone placing the Nuvio logo: README, HACS, docs, the dashboard itself, slides or print.
> Rendered page: `usage-guide.png` (and `usage-guide.pdf`) in this folder.

## 1. The logo
- **Idea**: a lowercase **n** drawn as an arched doorway with the door inside it: shelter, home, quiet order.
  On dark backgrounds the door lights up lime, a light left on.
- **Versions**: horizontal (primary) · stacked · symbol only · wordmark only, plus a **small-size cut** of the symbol
  and a pixel-grid favicon.
- **Files** (`assets/brand/`):
  | Use | File |
  |---|---|
  | Light backgrounds (default) | `final/nuvio-horizontal.svg`, `-stacked.svg`, `-symbol.svg`, `-wordmark.svg` |
  | Dark backgrounds (lit door) | `final/*-on-dark.svg` |
  | One colour | `final/*-black.svg`, `final/*-white.svg` (white is thinned 1.5 units per edge to offset glow), `final/*-mono-63d71e.svg` (dark backgrounds only) |
  | Symbol 20 to 47 px | `final/nuvio-symbol-small.svg` (`-small-on-dark`, `-small-white`) |
  | Favicon, exactly 16 / 32 / 48 px | `final/nuvio-favicon-grid16.svg`, `icons/favicon.svg` (switches to the lit door in dark mode), `icons/favicon.ico` |
  | App / PWA icons | `icons/nuvio-app-icon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `maskable-512.png`, `site.webmanifest`, `head-snippet.html` |
  | Raster copies | `final/png/` |

## 2. Clear space and proportions
- **Unit d = the width of the door** (one quarter of the symbol's width).
- Keep **1 d** of clear space on every side of every version. It scales with the logo; never use a fixed distance.
- Locked lockup spacing: horizontal, gap between symbol and wordmark = **1 d**; stacked, gap between the symbol's base and
  the top of the i-dot = **1 d**. The wordmark's x-height is **0.48 × the symbol height** in both lockups.
  Use the supplied files; don't rebuild lockups.

## 3. Minimum size
| Version | Screen | Print |
|---|---|---|
| Horizontal | 96 px wide | 25 mm wide |
| Stacked | 64 px wide | 18 mm wide |
| Wordmark only | 64 px wide | 15 mm wide |
| Symbol (master) | 48 px tall and up | 12 mm |
| Symbol, small cut | 20 to 47 px | 5 to 12 mm |
| Favicon grid file | exactly 16, 32 or 48 px | n/a |

**Switch rule**: below 48 px use the small cut (heavier frame, lower door, so it never reads as an "m");
at exactly 16 / 32 / 48 px use the pixel-grid favicon file.

## 4. Colour
| Name | Role | HEX | RGB | CMYK (approx.) | Pantone (closest, verify) |
|---|---|---|---|---|---|
| **Nuvio Ink** | primary logo colour | `#13211A` | 19 33 26 | 75 45 70 80 | Black 3 C |
| **Nuvio Lime** | the light: door on dark, app tile accent, UI accent | `#63D71E` | 99 215 30 | 60 0 100 0 | 7488 C |
| Moss (support) | green that must sit on white | `#3E9A10` | 62 154 16 | 75 10 100 10 | 362 C |
| White / Paper | backgrounds | `#FFFFFF` / `#F4F6F1` | 255 255 255 / 244 246 241 | 0 0 0 0 / 3 1 5 0 | n/a |

CMYK and Pantone values are conversions, not press-proofed: check them against a Pantone bridge guide before printing.

**Why Ink + Lime**: pure lime is energetic, not calm. So the logo itself is quiet deep ink, and lime appears only as the
light in the door on dark backgrounds and as the product accent. `#63D71E` stays unchanged, keeping equity with the
dashboard's default accent.

**Approved logo/background pairs (WCAG contrast)**
| Logo | Background | Contrast |
|---|---|---|
| Ink | White | 16.7 : 1 |
| Ink | Paper `#F4F6F1` | 15.3 : 1 |
| Ink | Lime | 8.9 : 1 (lime tiles, buttons; matches the "text on lime is dark" UI rule) |
| On-dark (white + lime door) | Ink | 16.7 : 1 (white), 8.9 : 1 (lime) |
| On-dark | HA dark UI `#1E2023` | 16.3 : 1 (white), 8.8 : 1 (lime) |
| Black / white one-colour | white / black | 21 : 1 |

**Never**: lime or white logo on white or lime (1.9 : 1), ink logo on dark UI (1.0 : 1). On photos, use the on-dark or
white version on a calm, dark area, or place the symbol on an ink rounded tile.

## 5. Typography
- The wordmark is custom geometry (paths). Never retype it.
- Supporting text: **DM Sans** (SIL Open Font License, already the dashboard's UI font), 400 / 500 / 600.
  Fallback: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

## 6. Don'ts
Don't stretch or squash · don't recolour outside the palette · don't put the lime or white logo on light backgrounds ·
don't add shadows, outlines, gradients or glass effects to the mark · don't rearrange or resize the parts of a lockup ·
don't retype the wordmark in a font · don't rotate · don't use the master symbol below 48 px (use the small cut).

## 7. Contact
Questions about usage: the Nuvio maintainer (see `README.md`). Master files: `assets/brand/final/`.
Trademark: no clearance search has been done yet; run one before registering or using the mark commercially.
