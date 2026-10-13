<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.png">
    <img src="docs/assets/logo-light.png" alt="Nuvio" width="300">
  </picture>
</p>

<p align="center"><strong>A glass-style Home Assistant dashboard that builds itself from your home.</strong></p>

<p align="center">
  <a href="https://hacs.xyz"><img src="https://img.shields.io/badge/HACS-Custom-41BDF5?style=flat-square" alt="HACS Custom"></a>
  <img src="https://img.shields.io/badge/Home%20Assistant-2024.8.0%2B-18BCF2?style=flat-square&logo=homeassistant&logoColor=white" alt="Home Assistant 2024.8.0+">
  <img src="https://img.shields.io/badge/version-v0.3.5-a3e635?style=flat-square" alt="v0.3.5">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT"></a>
</p>

<p align="center"><b>English</b> · <a href="README.pl.md">Polski</a></p>

---

Nuvio is a complete dashboard (pages, navigation, cards and an in-place editor) shipped as a single
frontend plugin. It contains **no hard-coded entities**: on first start it reads your areas, devices
and entities from Home Assistant and generates the views. Everything can then be changed in edit mode.

## Screenshots

<p align="center">
  <img src="docs/screenshots/demo_dashboard_dark_1440.png" alt="Home (dark)" width="49%">
  <img src="docs/screenshots/demo_rooms_light_1440.png" alt="Rooms (light)" width="49%">
</p>
<p align="center">
  <img src="docs/screenshots/demo_kamery_dark_1440.png" alt="Cameras (dark)" width="49%">
  <img src="docs/screenshots/demo_pokoj_salon_dark_1440.png" alt="Room view (dark)" width="49%">
</p>
<p align="center">
  <img src="docs/screenshots/demo_family_light_1440.png" alt="Family (light)" width="49%">
</p>
<p align="center">
  <img src="docs/screenshots/demo_multimedia_light_390.png" alt="Media on mobile (light)" width="24%">
  <img src="docs/screenshots/demo_wizard_dark_390.png" alt="First-run wizard on mobile (dark)" width="24%">
</p>

## Features

- **Auto-generated dashboard** (dashboard strategy `custom:nuvio`): Home, Rooms (+ room detail), Media, Cameras, Family, Energy.
  Each view appears only if you have matching entities; missing integrations are simply hidden.
- **First-run wizard** (admins): language (Polski / English), views, visible rooms.
- **Empty rooms**: a room with no devices offers **Import from area** (preview of the area's entities plus name matches, with checkboxes; **Pick entities** to choose any entity by hand; optionally also assign them to the area in Home Assistant) and **Create custom layout** (edit mode with an empty room and the + Add gallery). Area settings stays as a secondary link.
- **Edit mode**: drag & drop, hide/restore, S/M/L sizes, add tiles from any entity, swap entities, display styles with live preview,
  appearance (accent colour with automatic WCAG contrast, background photo / colour / gradient, dimming).
- **Component gallery (+ Add)**: a **Basic** group first (Slider, Button, Entity list, Select, Stepper, Gauge, with live thumbnails, also available in rooms), then **Cards** for specific device types. The component form has no display mode picker; real variants (slider horizontal or vertical, button tile or row, select chips or list) are listed as **Component options**.
  <br><img src="docs/components/gallery-basic.png" alt="Component gallery with the Basic group" width="420">
- **Per-user storage**: layout and appearance are stored per user in Home Assistant (`frontend/set_user_data`, key `nuvio_layout`) with a local fallback.
- **Polish and English UI**: cards, edit mode and appearance follow the language picked in the wizard (or `language:` / your HA profile); numbers and dates use the same locale.
- **Keyboard friendly edit mode**: arrow keys on a tile's drag handle move it, arrow up/down reorder entity lists.
- **Light and dark mode**, touch friendly, reduced-motion aware.

## Components

Every card can be used on its own as `custom:nuvio-<name>-card` (for example in a regular dashboard after *Take control*). Screenshots: dark theme, default background, demo data.

<details open>
<summary><b>Home & climate</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="docs/components/weather.png" alt="Weather" width="100%"><br><b>Weather</b> <code>custom:nuvio-weather-card</code><br>Current conditions, hourly forecast and sunrise/sunset; tap for daily details. <code>weather.*</code>, optional temperature sensor, <code>sun.sun</code>.</td>
<td width="50%" valign="top"><img src="docs/components/climate.png" alt="Climate" width="100%"><br><b>Climate</b> <code>custom:nuvio-ac-card</code><br>Large target temperature with a slider, HVAC modes, fan and swing. <code>climate.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/light.png" alt="Light" width="100%"><br><b>Light</b> <code>custom:nuvio-light-card</code><br>Brightness slider for one light. <code>light.*</code>.</td>
<td width="50%" valign="top"><img src="docs/components/switch.png" alt="Switch" width="100%"><br><b>Switch</b> <code>custom:nuvio-switch-card</code><br>Glass toggle as a row or a tile. <code>switch.*</code>, <code>input_boolean.*</code>, <code>fan.*</code> and other on/off entities.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/scenes.png" alt="Scenes & scripts" width="100%"><br><b>Scenes & scripts</b> <code>custom:nuvio-scenes-card</code><br>Several scenes or scripts as buttons with a confirmation animation. <code>scene.*</code>, <code>script.*</code>.</td>
<td width="50%" valign="top"><img src="docs/components/script.png" alt="Script" width="100%"><br><b>Script</b> <code>custom:nuvio-script-card</code><br>A single tile that runs one script. <code>script.*</code>, <code>scene.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/sensors.png" alt="Sensors" width="100%"><br><b>Sensors</b> <code>custom:nuvio-sensors-card</code><br>Auto-discovered motion, occupancy, door, window, moisture and other binary sensors with filters. <code>binary_sensor.*</code>.</td>
<td width="50%"></td>
</tr>
</table>
</details>

<details open>
<summary><b>Energy</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="docs/components/power.png" alt="Power now" width="100%"><br><b>Power now</b> <code>custom:nuvio-power-card</code><br>Current power with a sparkline of the last hours. <code>sensor.*</code> with <code>device_class: power</code>.</td>
<td width="50%" valign="top"><img src="docs/components/phases.png" alt="Phases" width="100%"><br><b>Phases</b> <code>custom:nuvio-phases-card</code><br>Power, voltage and current per phase with load bars. Power / voltage / current sensors per phase.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/energy-stats.png" alt="Energy statistics" width="100%"><br><b>Energy statistics</b> <code>custom:nuvio-energy-stats-card</code><br>Consumption vs production for today, this week and this month with a chart. Long-term statistics or the HA Energy dashboard settings.</td>
<td width="50%" valign="top"><img src="docs/components/week.png" alt="Energy week" width="100%"><br><b>Energy week</b> <code>custom:nuvio-week-card</code><br>Grid consumption and PV production for the last 7 days. Energy statistics.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/solar.png" alt="Solar" width="100%"><br><b>Solar</b> <code>custom:nuvio-solar-card</code><br>PV production over the last days as an area chart. One energy statistic plus an optional today sensor.</td>
<td width="50%" valign="top"><img src="docs/components/pv.png" alt="Photovoltaics" width="100%"><br><b>Photovoltaics</b> <code>custom:nuvio-pv-card</code><br>Inverter state, power now, energy today, strings and temperature. Inverter sensors.</td>
</tr>
</table>
</details>

<details open>
<summary><b>Media & cameras</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="docs/components/players.png" alt="Media players" width="100%"><br><b>Media players</b> <code>custom:nuvio-players-card</code><br>All players with artwork, title, progress, transport, volume and source. <code>media_player.*</code> (auto-discovered).</td>
<td width="50%" valign="top"><img src="docs/components/media.png" alt="Media player" width="100%"><br><b>Media player</b> <code>custom:nuvio-media-card</code><br>Compact card for a single player. <code>media_player.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/camera.png" alt="Camera" width="100%"><br><b>Camera</b> <code>custom:nuvio-camera-card</code><br>Snapshot refreshed every few seconds, live view on tap. <code>camera.*</code>.</td>
<td width="50%" valign="top"><img src="docs/components/cameras.png" alt="Cameras" width="100%"><br><b>Cameras</b> <code>custom:nuvio-cameras-card</code><br>Working cameras as large tiles, unavailable ones collapsed into chips. <code>camera.*</code>.</td>
</tr>
</table>
</details>

<details open>
<summary><b>People & calendar</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="docs/components/people.png" alt="Household" width="100%"><br><b>Household</b> <code>custom:nuvio-people-card</code><br>Everyone with avatar, zone and time since the last change. <code>person.*</code>, optional <code>zone.*</code>.</td>
<td width="50%" valign="top"><img src="docs/components/person.png" alt="Person" width="100%"><br><b>Person</b> <code>custom:nuvio-person-card</code><br>One person with avatar and current zone. <code>person.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/agenda.png" alt="Agenda" width="100%"><br><b>Agenda</b> <code>custom:nuvio-agenda-card</code><br>Upcoming events grouped by day, colour per calendar. <code>calendar.*</code>.</td>
<td width="50%" valign="top"><img src="docs/components/month.png" alt="Month" width="100%"><br><b>Month</b> <code>custom:nuvio-month-card</code><br>Month grid with event dots and the selected day list. <code>calendar.*</code>.</td>
</tr>
</table>
</details>

<details open>
<summary><b>Security & devices</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="docs/components/alarm.png" alt="Alarm" width="100%"><br><b>Alarm</b> <code>custom:nuvio-alarm-card</code><br>Alarm state and arm/disarm modes based on supported features, with a code keypad. <code>alarm_control_panel.*</code>.</td>
<td width="50%" valign="top"><img src="docs/components/robots.png" alt="Robots" width="100%"><br><b>Robots</b> <code>custom:nuvio-robots-card</code><br>Vacuums and mowers: state, start/dock/locate, suction and last clean. <code>vacuum.*</code>, <code>lawn_mower.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/net.png" alt="Network" width="100%"><br><b>Network</b> <code>custom:nuvio-net-card</code><br>Internet status, latency and speed; other sections cover gateway, access points, Wi-Fi and clients. UniFi entities.</td>
<td width="50%"></td>
</tr>
</table>
</details>

<details open>
<summary><b>Rooms & navigation</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="docs/components/areas.png" alt="Rooms" width="100%"><br><b>Rooms</b> <code>custom:nuvio-areas-card</code><br>Every HA area with temperature, humidity, lights, motion and climate. Area registry.</td>
<td width="50%" valign="top"><img src="docs/components/room.png" alt="Room" width="100%"><br><b>Room</b> <code>custom:nuvio-room-card</code><br>All entities of one area grouped by kind (lights, climate, covers, switches…). Opened as <code>?area=<id></code>. An empty room offers Import from area or Create custom layout.<br><img src="docs/components/empty-room.png" alt="Empty room: import from area" width="100%"></td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/link.png" alt="Link" width="100%"><br><b>Link</b> <code>custom:nuvio-link-card</code><br>Navigation or action tile. Any path or action.</td>
<td width="50%"></td>
</tr>
</table>
</details>

<details open>
<summary><b>General controls</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="docs/components/slider.png" alt="Slider" width="100%"><br><b>Slider</b> <code>custom:nuvio-slider-card</code><br>Slider for brightness, volume, fan speed, cover position or a numeric value, horizontal or vertical. <code>light.*</code>, <code>media_player.*</code>, <code>fan.*</code>, <code>cover.*</code>, <code>valve.*</code>, <code>input_number.*</code>, <code>number.*</code>.</td>
<td width="50%" valign="top"><img src="docs/components/button.png" alt="Button" width="100%"><br><b>Button</b> <code>custom:nuvio-button-card</code><br>Button that runs a script, scene, button or any action, as a tile or a pill, with a Done confirmation. <code>script.*</code>, <code>scene.*</code>, <code>button.*</code>, <code>input_button.*</code>, <code>automation.*</code>, or any <code>tap_action</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/entities.png" alt="Entities" width="100%"><br><b>Entities</b> <code>custom:nuvio-entities-card</code><br>Entity list where each row shows a switch, a Run button or a value. <code>light.*</code>, <code>switch.*</code>, <code>fan.*</code>, <code>input_boolean.*</code>, <code>script.*</code>, <code>scene.*</code>, <code>button.*</code>, <code>sensor.*</code>, <code>binary_sensor.*</code> and other read-only entities.</td>
<td width="50%" valign="top"><img src="docs/components/select.png" alt="Select" width="100%"><br><b>Select</b> <code>custom:nuvio-select-card</code><br>Option picker shown as chips or a list. <code>input_select.*</code>, <code>select.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/stepper.png" alt="Stepper" width="100%"><br><b>Stepper</b> <code>custom:nuvio-stepper-card</code><br>Counter with increment, decrement and reset, or step a numeric value up and down. <code>counter.*</code>, <code>input_number.*</code>, <code>number.*</code>.</td>
<td width="50%" valign="top"><img src="docs/components/gauge.png" alt="Gauge" width="100%"><br><b>Gauge</b> <code>custom:nuvio-gauge-card</code><br>Arc gauge showing a sensor value, with a default range chosen by unit. <code>sensor.*</code>, <code>input_number.*</code>, <code>number.*</code>.</td>
</tr>
</table>
</details>

**Other cards**

- `custom:nuvio-map-card`: the native HA map in a glass frame (no screenshot: map tiles need internet access).
- `custom:nuvio-energy-card`: load percentage of the total phase power against your maximum (no screenshot yet: it does not render correctly outside a fixed-height grid).
- `custom:nuvio-bars-card`: daily consumption bars from statistics (no screenshot yet: same fixed-height issue).
  - `custom:nuvio-gauge-card`: a numeric sensor on an arc.
- `custom:nuvio-page`: the full-screen layout itself (top bar, rail, header, card panel); every screenshot above uses it.

### Planned

From [docs/STATUS.md](docs/STATUS.md). There are no other planned components in the code (no TODOs or "coming soon" entries).

| Item | Status |
|---|---|
| View editor: add, rename and reorder whole views | done (Appearance → Views) |
| Full i18n of cards and edit mode | done (Polish / English) |
| Config export / import UI | not started |
| Empty-state hints on an empty Home view | done |

## Installation

### HACS (custom repository)

1. HACS → ⋮ → *Custom repositories* → `https://github.com/kczepiec/nuvio`, category **Dashboard**.
2. Install **Nuvio**. HACS adds the resource `/hacsfiles/nuvio/nuvio.js`.
3. Settings → Dashboards → *Add dashboard* → *New dashboard from scratch*, open it, ⋮ → *Edit* → ⋮ → *Raw configuration editor* and paste:

   ```yaml
   strategy:
     type: custom:nuvio
   ```

4. Open the dashboard. The wizard starts on first visit.

### Manual

1. Download the source archive of the latest release (GitHub, Releases, Source code) and copy the contents of its `dist/` folder (`nuvio.js` and the `nuvio-font-*`, `nuvio-bg-*`, `nuvio-meteo-*` files, all flat) to `/config/www/nuvio/`. Releases have no attached files.
2. Add the resource `/local/nuvio/nuvio.js` (type: **JavaScript module**).
3. Use the same `strategy` config as above.

## Recommended companion packages

Nuvio works on its own, but for the full-screen look from the screenshots these HACS packages help:

| Package | Why |
|---|---|
| [kiosk-mode](https://github.com/NemesisRE/kiosk-mode) | Hides the Home Assistant header and/or sidebar, so only the Nuvio dashboard is visible (wall tablets, phones). Nuvio's navigation is kiosk-mode aware. |
| [custom-sidebar](https://github.com/elchininet/custom-sidebar) | Hides or reorders Home Assistant sidebar items per user or device, if you prefer to keep the sidebar but trim it. |
| [browser_mod](https://github.com/thomasloven/hass-browser_mod) *(optional)* | Turns a browser into a controllable device (popups, per-device control). Nuvio handles its interaction overlay and skips browser_mod's own media players and sensors. |

## Configuration

Optional strategy options:

```yaml
strategy:
  type: custom:nuvio
  language: en        # pl | en (default: your HA language)
```

> [!TIP]
> To take over a generated dashboard as plain YAML, use *Take control* in the dashboard editor. All `custom:nuvio-*` cards keep working.

## Presets

Configuration (layout + appearance) can be exported/imported as JSON. Personal presets live outside the repository.

## Development

```bash
python3 tools/build.py   # -> dist/nuvio.js
python3 tools/guard.py   # fails if any house-specific id slipped into dist
```

Releases are built by GitHub Actions on `v*` tags.

## Changelog

### 0.3.5
- Fixed: a background chosen in an older version (stored with the old `assets/backgrounds/` or `assets/bg/` path) is migrated to the new flat `nuvio-bg-*` file, so it shows again after updating.

### 0.3.4
- Fixed: fonts, backgrounds and weather icons were missing after a HACS install. HACS only downloads files that sit directly in `dist/`, so all assets now live there with unique names (`nuvio-font-*`, `nuvio-bg-*`, `nuvio-meteo-*`); background credits are in `dist/CREDITS.md`.
- Fixed: the asset base is taken from the module URL, so a manual install under `/local/nuvio/` loads its own fonts and backgrounds instead of `/hacsfiles/nuvio/`.

### 0.3.3
- Fixed: in edit mode the drag handle and X of the first block in a room column were drawn on the previous column's block; every block now has exactly one handle (top left), one X (top right) and S/M/L inside it.
- Changed: releases no longer attach `nuvio.zip` or `nuvio.js`. HACS then installs the full `dist/` folder including `assets/` (fonts, backgrounds); with attached files it skipped `dist/` and kept an old build. Manual install uses `dist/` from the release source archive.

### 0.3.2
- The + Add gallery header shows the loaded Nuvio version, so an outdated or cached bundle (no Basic group) is easy to spot. After updating in HACS, reload the browser (Ctrl+Shift+R) or clear the app cache.

### 0.3.1
- Fixed: the generic components (Slider, Button, Entity list, Select, Stepper, Gauge) were missing from the + Add gallery in rooms (the room gallery only listed tile components); they now appear in a **Basic** group with live thumbnails, and rooms render added components.
- Changed: the component form no longer shows a display mode picker; genuine variants are labelled **Component options**.
- Fixed: unchecked checkboxes in the room import dialog were invisible on dark backgrounds.

### 0.3.0
- New: empty room view with two actions. **Import from area** shows the area's entities (and entities whose name matches the room) with checkboxes, a **Pick entities** search for manual choice, and an option to also assign them to the area in Home Assistant; selected entities become tiles arranged by type (climate and cameras large, media medium). **Create custom layout** opens edit mode with an empty room and the + Add gallery.

### 0.2.1
- Fixed: HACS registered `nuvio.zip` instead of `nuvio.js` as the dashboard resource, so the dashboard strategy never loaded ("Timeout waiting for strategy element").

### 0.2.0
- Fixed: scene buttons now call `scene.turn_on` (they did nothing before).
- Fixed: kW / MW power sensors are converted to watts in the power, energy, phases and PV cards.
- Fixed: cameras in the room view no longer break after ~10 minutes (rotating image token).
- Fixed: layout saves merge with the latest server copy (no overwrite between devices); the local cache is per Home Assistant user.
- Fixed: AC chevrons no longer keep repeating after release outside the card; `heat_cool` range thermostats are read-only; 0.5 °C default step.
- Fixed: TV in standby turns on; play/pause, cover and valve buttons respect what the device supports.
- Fixed: month calendar refreshes; alarm code field keeps focus; weather uses the precipitation unit and text wind bearings.
- Fixed: page no longer crashes with an empty rail; leaving edit mode by navigation saves instead of discarding.
- Added: English UI for all cards, the page and edit mode.
- Added: keyboard reordering in edit mode; undo after removing a tile restores only that tile.
- HACS: fonts, backgrounds and weather icons are installed with the plugin (whole `dist/` folder).
- Multi-step onboarding wizard; custom views (Appearance → Views); Map and Calendar components and views.
- General components: slider, button, entities, select, stepper, gauge.
- Empty-state hint cards, display modes for group cards, editable view title and subtitle, stacked toaster.

### 0.1.1
- Component-first "+ Add" gallery with live preview; kiosk drawer fix; component catalog in the README.

## License & credits

Nuvio is released under the [MIT License](LICENSE).

Bundled third-party assets:
- [DM Sans](dist/nuvio-font-OFL.txt): SIL Open Font License 1.1
- [Meteocons](dist/nuvio-meteo-LICENSE.txt) by Bas Milius, MIT
- [Default background photo](dist/CREDITS.md): "House in forest" by Flo Pappert, CC0 1.0 (via Wikimedia Commons)
