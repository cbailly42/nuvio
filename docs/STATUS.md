# Nuvio status (2026-10-14)
Done: (a) no house-specific ids in dist (tools/guard.py, CI); (b) dashboard strategy `custom:nuvio` + first-run wizard (PL/EN), registry via hass.areas/entities with WS fallback;
(c) edit mode covers tiles/sections/appearance and whole views (Appearance → Views); (d) HACS layout (dist/nuvio.js + dist/assets in nuvio.zip, hacs.json zip_release, README PL/EN, MIT, release workflow);
(e) views only for present domains; (f) Polish / English UI for cards, page and edit mode (hgTr); empty-state hints.
(g) config export/import UI: Appearance → Layout backup in edit mode (src/parts/hg-backup.part.js), versioned JSON, Replace / Merge, restore previous.
(h) wall tablet mode (src/parts/hg-wall.part.js, 0.5.0): Appearance → Wall tablet mode, off by default; idle screensaver with clock + photo, dimming, wake on touch or binary_sensor; settings in HGL.data.wall, part of Layout backup.
(i) 1.2.0: conditional, glance, stat, humidifier, timer, logbook and webpage cards; kiosk mode toggle in the user menu (hgKmOff / hgKmPath in hg-core); form library src/parts/ui/form.part.js (hgForm, hg-check) and datalist upgrade (hgSugUp in hg-select); light-mode glass less transparent.

## Planned (source of truth for README roadmap)

- Assist: talk to Home Assistant Assist with the reply shown inline (card in 0.10.0, dialog from the header in 0.11.0)
- Notifications center: persistent notifications, low batteries, open doors and unavailable devices in one panel (planned)
- Energy dashboard integration: read sources and devices from the HA Energy settings instead of manual sensors (planned)
- Energy and bars card fix: render `nuvio-energy-card` and `nuvio-bars-card` correctly outside a fixed-height grid (planned)
- Map card setup: clear hint and fallback when map tiles are unavailable, plus a README screenshot (planned)
- Per-device layouts: different layout for phone, tablet and desktop instead of one shared layout (planned)
- Theme editor: custom glass blur, radius, fonts and colour palettes beyond the accent colour (planned)
- Preset sharing: share layouts and appearance as presets, with an import gallery of community presets (planned)
- Component library and new design (1:1 with the reference): tokens, shared primitives, overlays, live updates, animations, S/M/L sizes for wide and narrow panels, performance. Step 1 done in 0.11.2: one card per file in src/parts/cards, shared helpers in src/parts/shared. Step 2 done in 0.12.0: design tokens (shape, glass, motion, type) and new glass sheen, rim and shadow. Step 3 done in 0.13.0: ui/ building blocks, live DOM patching (ui/morph), UI gallery. Step 4 done in 0.14.0: overlay manager ui/overlay (dialog, alert, sheet, popover, menu, tooltip) and ui/toast, HGConfirm on top of it. Step 5 done in 0.15.0: every card on live patching (afterRender idempotent via _once, code-owned slots kept by morph), shared controls and radii on tokens. Step 6 done in 0.16.0: 12 generic cards (hero, toggle, progress, arc, chart, room-compact, actions, family, cover, lock, fan, todo), stack and tabs containers, docs/examples/inspiration-dashboard.yaml, shared history store. Step 7 done in 1.0.0: esbuild minification in tools/build.py (1253 to 1033 KB), off-screen cards paused (HG_VIS IntersectionObserver in hg-core), history, net and editor charts on hgHistory. Lazy loading of the editor not done: the bundle is one shared scope and the whole core evaluates in about 110 ms, so splitting it would cost more than it saves
- Layout containers like HA: done in 1.1.0. hg-grid-card (grid-card.part.js, extends HGStackCard), stack options (gap, ratio, wrap_below, divider), hgFromHA conversion in hgMakeCard and the page build, editor: HG_COMP layout group (grid, vstack, hstack, hacard), child list in _eComp (_eKidAct: kadd, kedit, kdup, kdel, kspan, kmove, kout; frames in _eKidStk), hgYaml parser for pasted HA cards
- Screensaver lock (BETA): tapping the screensaver shows a PIN pad over a blurred background (round digits on a light or dark blur, PIN dots above, a Lock button below); settings for PIN, lock delay and on/off, marked BETA in settings (planned)
- Accessibility pass: screen reader labels, focus order and contrast audit for all cards and edit mode (planned)

