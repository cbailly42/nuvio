# Nuvio status (2026-10-13)
Done: (a) no house-specific ids in dist (tools/guard.py, CI); (b) dashboard strategy `custom:nuvio` + first-run wizard (PL/EN), registry via hass.areas/entities with WS fallback;
(c) edit mode covers tiles/sections/appearance and whole views (Appearance → Views); (d) HACS layout (dist/nuvio.js + dist/assets in nuvio.zip, hacs.json zip_release, README PL/EN, MIT, release workflow);
(e) views only for present domains; (f) Polish / English UI for cards, page and edit mode (hgTr); empty-state hints.
(g) config export/import UI: Appearance → Layout backup in edit mode (src/parts/hg-backup.part.js), versioned JSON, Replace / Merge, restore previous.

## Planned (source of truth for README roadmap)

- Wall tablet mode: screensaver with clock and photo after idle, dimming, wake on touch or motion sensor (planned)
- Assist / voice card: talk to Home Assistant Assist from a glass card, with the reply shown inline (planned)
- Notifications center: persistent notifications, low batteries, open doors and unavailable devices in one panel (planned)
- Energy dashboard integration: read sources and devices from the HA Energy settings instead of manual sensors (planned)
- Energy and bars card fix: render `nuvio-energy-card` and `nuvio-bars-card` correctly outside a fixed-height grid (planned)
- Map card setup: clear hint and fallback when map tiles are unavailable, plus a README screenshot (planned)
- Per-device layouts: different layout for phone, tablet and desktop instead of one shared layout (planned)
- Theme editor: custom glass blur, radius, fonts and colour palettes beyond the accent colour (planned)
- Preset sharing: share layouts and appearance as presets, with an import gallery of community presets (planned)
- Accessibility pass: screen reader labels, focus order and contrast audit for all cards and edit mode (planned)

