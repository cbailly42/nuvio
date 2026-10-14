# Nuvio status (2026-10-14)
Done: (a) no house-specific ids in dist (tools/guard.py, CI); (b) dashboard strategy `custom:nuvio` + first-run wizard (PL/EN), registry via hass.areas/entities with WS fallback;
(c) edit mode covers tiles/sections/appearance and whole views (Appearance → Views); (d) HACS layout (dist/nuvio.js + dist/assets in nuvio.zip, hacs.json zip_release, README PL/EN, MIT, release workflow);
(e) views only for present domains; (f) Polish / English UI for cards, page and edit mode (hgTr); empty-state hints.
(g) config export/import UI: Appearance → Layout backup in edit mode (src/parts/hg-backup.part.js), versioned JSON, Replace / Merge, restore previous.
(h) wall tablet mode (src/parts/hg-wall.part.js, 0.5.0): Appearance → Wall tablet mode, off by default; idle screensaver with clock + photo, dimming, wake on touch or binary_sensor; settings in HGL.data.wall, part of Layout backup.

## Planned (source of truth for README roadmap)

- Assist: talk to Home Assistant Assist with the reply shown inline (card in 0.10.0, dialog from the header in 0.11.0)
- Notifications center: persistent notifications, low batteries, open doors and unavailable devices in one panel (planned)
- Energy dashboard integration: read sources and devices from the HA Energy settings instead of manual sensors (planned)
- Energy and bars card fix: render `nuvio-energy-card` and `nuvio-bars-card` correctly outside a fixed-height grid (planned)
- Map card setup: clear hint and fallback when map tiles are unavailable, plus a README screenshot (planned)
- Per-device layouts: different layout for phone, tablet and desktop instead of one shared layout (planned)
- Theme editor: custom glass blur, radius, fonts and colour palettes beyond the accent colour (planned)
- Preset sharing: share layouts and appearance as presets, with an import gallery of community presets (planned)
- Component library and new design (1:1 with the reference): tokens, shared primitives, overlays, live updates, animations, S/M/L sizes for wide and narrow panels, performance. Step 1 done in 0.11.2: one card per file in src/parts/cards, shared helpers in src/parts/shared. Step 2 done in 0.12.0: design tokens (shape, glass, motion, type) and new glass sheen, rim and shadow. Step 3 done in 0.13.0: ui/ building blocks, live DOM patching (ui/morph), UI gallery (in progress)
- Accessibility pass: screen reader labels, focus order and contrast audit for all cards and edit mode (planned)

