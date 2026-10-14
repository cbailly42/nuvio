# Nuvio design rules

Every new feature, card, dialog and setting must meet all of the rules below before it is released. Treat this file as a checklist for pull requests.

## Language and copy

- The UI is Polish first. Every string goes through `hgTr('Polski', 'English')`; the English text is the fallback for non Polish users.
- Short, plain labels. No jargon where a simple word works ("Zapisz", "Gotowe", "Wstecz").
- No em dashes or en dashes in the README files, changelog, docs or release notes. Use commas, colons or full stops.
- Every user visible change gets a changelog entry in both README.md and README.pl.md.

## Visual style

- Modern glassmorphism: translucent glass surfaces, soft blur (one blur layer, no nested backdrop filters), subtle inner highlight and soft drop shadow.
- Accent colour: lime `#63D71E` by default, always used through the accent variables (`--hg-accent`, `--hg-accent-tx`, `--hg-on-accent`, `--hg-accent-soft`). Never hard code the accent in a component.
- Text on a lime surface is black (`--hg-on-accent`), never white.
- Light and dark schemes both work; colours come from the theme tokens.
- Rounded shapes: cards and sheets use the shared radius tokens, pills are fully rounded.
- Icons are MDI (`ha-icon`) at consistent sizes (18 to 24 px in controls).

## Controls

- No native controls are visible anywhere. Use the shared Nuvio controls:
  - Selects: the glass select (`hg-select`, applied automatically by `hgSelWatch` on every shadow root).
  - Sliders: the custom slider style (`HG_RANGE_CSS`: slim track, accent fill through `--v`, white thumb that grows on hover and drag).
  - Icons: the searchable icon picker with the full MDI list, recent icons and keyboard navigation.
  - Switches: the glass switch (`role="switch"`, `aria-checked`).
- Touch targets are at least 44 px high on touch devices.

## Dialogs and sheets

- **Gotowe** saves and closes without asking anything.
- A discard prompt appears only when the user closes with **X** or by tapping outside while there are unsaved changes.
- In nested steps, **X** goes back one step instead of closing everything.
- Changing a field never remounts the sheet: update in place, keep scroll position and focus.
- The blur behind a sheet is present from the very first frame (no flash of a sharp background).
- Touch gestures that start inside a dialog, sheet, slider, picker or horizontally scrolling row never switch the dashboard view. Any other element can opt out with `data-no-swipe`. While a dialog is open, view swipe is off.
- Assist is a dialog opened from the header (or the A key), not a card in views.
- Settings live in the tabbed settings panel (Wygląd, Widoki, Pokoje, Nagłówek i nawigacja, Tła, Wygaszacz, Kopia zapasowa). New settings go into the matching tab, with proper column labels.

## Components and cards

- Every component appears in **+ Dodaj** with a live preview in the gallery. When the home has no matching entity, the gallery shows a mock preview instead of an empty box.
- Full configuration through the form: every option a user may need has a form field (entity pickers, text, numbers, switches, modes).
- Every component also has the **advanced JSON** field; its values override the form.
- Everything a component stores is part of the layout, so it is included in **export and import** (layout backup) without extra code.
- Sizes **S, M and L** are real grid spans with dense packing. Card content adapts with **container queries** (no overflow, no clipping, less detail at S).
- Every card has an **empty state**: a short title and one line telling the user what to pick, never a blank or broken card.
- Unavailable entities are shown as such (dimmed, "niedostępne"), never as an error.
- Service calls respect `window.__hgDryRun` so screenshots and tests never change the home.

## Layout and responsiveness

- Verify every feature at **1440 px** (desktop) and **390 px** (phone), plus tablet when the layout changes.
- Phone: sheets become bottom sheets, tabs become a scrollable chip row, tables become labelled cards.
- Full width and narrow panel modes both have to look right; edit buttons stay next to the element they edit.

## Motion and accessibility

- Animations are short and soft (150 to 400 ms, ease out). Everything respects `prefers-reduced-motion`.
- Visible focus rings (accent coloured) on every interactive element; full keyboard use (Tab, Enter, Space, arrows, Escape).
- ARIA roles and labels on custom controls (listbox, switch, tab, dialog, live regions for changing text).
- Sufficient contrast on any background, including photos.

## Screensaver (wall tablet mode)

- No backgrounds, panels or pills behind any screensaver element (clock, date, weather, calendar, hint). Plain white text and icons with a soft text shadow only.
- The wake hint is centred at the bottom and pulses gently, with no motion when reduced motion is set.

## Assets and build

- All assets are flat in `dist/` with `nuvio-*` file names (backgrounds, fonts, weather icons). No sub folders.
- The source is unbranded (`hg-*`); `tools/build.py` maps it to `nuvio-*`. `tools/guard.py` must pass (no house specific ids).
- Before release: `python3 tools/build.py`, `python3 tools/guard.py` and `node --check` on `.mjs` copies of the loader and the core.
- Semantic versioning: features raise the minor version, fixes the patch version.
