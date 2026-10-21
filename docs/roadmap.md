**English** · [Polski](pl/roadmap.md) · [Français](fr/roadmap.md)

# Roadmap

Roadmap of next features; the source of truth is [STATUS.md](STATUS.md). Back to the [README](../README.md).

| Feature | Description | Status |
|---|---|---|
| Assist / voice card | talk to Home Assistant Assist from a glass card, with the reply shown inline | done in 0.10.0 |
| Notifications center | persistent notifications, low batteries, open doors and unavailable devices in one panel | planned |
| Energy dashboard integration | read sources and devices from the HA Energy settings instead of manual sensors | in progress: the Energy week card already reads consumption, production and price from the HA Energy settings; the power, phases and solar cards still use chosen sensors |
| Energy and bars card fix | render `nuvio-energy-card` and `nuvio-bars-card` correctly outside a fixed-height grid | planned |
| Map card setup | clear hint and fallback when map tiles are unavailable, plus a README screenshot | planned |
| Per-device layouts | different layout for phone, tablet and desktop instead of one shared layout | planned |
| Theme editor | custom glass blur, radius, fonts and colour palettes beyond the accent colour | planned |
| Preset sharing | share layouts and appearance as presets, with an import gallery of community presets | planned |
| Component library and new design | shared building blocks (glass, buttons, switches, pills, overlays), new generic cards, smooth animations, live updates without redrawing a card, S, M and L sizes for wide and narrow panels, faster loading | done in 1.0.0: cards split into files in 0.11.2, new glass and design tokens in 0.12.0, building blocks and live updates in 0.13.0, overlays in 0.14.0, every card on the shared look and live updates in 0.15.0, 12 generic cards, stack and tabs in 0.16.0, smaller bundle and paused off-screen cards in 1.0.0 |
| Screensaver lock (BETA) | tap the screensaver to get a round glass PIN pad over a blurred background, with PIN dots above and a Lock button below; settings for PIN, lock delay and on/off | done in 1.3.0, unlock animation in 1.3.1 |
| Shared dashboard | one dashboard for every Home Assistant user, set up by an admin, with an opt-out per person for their own editable layout (Settings → Users) | done in 1.4.0 |
| View visibility per person | choose who sees each view; every view is visible to everyone by default (Settings → Views) | done in 1.5.0 |
| Roles and permissions | per-person rights beyond views: who may edit the shared dashboard, open Settings or use the PIN lock, and hidden cards or rooms per person | planned |
| Accessibility pass | screen reader labels, focus order and contrast audit for all cards and edit mode | planned |

Already done from the previous roadmap: view editor (Settings → Views), full Polish / English i18n, config export / import (Settings → Backup), empty-state hints on Home, wall tablet mode (Settings → Screensaver).
