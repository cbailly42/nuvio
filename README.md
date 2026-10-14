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
  <img src="https://img.shields.io/badge/version-v0.11.0-a3e635?style=flat-square" alt="v0.11.0">
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
- **First-run wizard** (admins): a glass, step-by-step setup with a live preview: language (Polski / English), views, visible rooms, accent colour and background, then a summary where every step can be reopened.
- **Empty rooms**: a room with no devices offers **Import from area** (preview of the area's entities plus name matches, with checkboxes; **Pick entities** to choose any entity by hand; optionally also assign them to the area in Home Assistant) and **Create custom layout** (edit mode with an empty room and the + Add gallery). Area settings stays as a secondary link.
- **Edit mode**: drag & drop, hide/restore, S/M/L sizes, add tiles from any entity, swap entities, display styles with live preview,
  appearance (accent colour with automatic WCAG contrast, background photo / colour / gradient, dimming).
- **Component gallery (+ Add)**: a **Basic** group first (Slider, Button, Entity list, Select, Stepper, Gauge, with live thumbnails, also available in rooms), then **Cards** for specific device types. The component form has no display mode picker; real variants (slider horizontal or vertical, button tile or row, select chips or list) are listed as **Component options**.
  <br><img src="docs/components/gallery-basic.png" alt="Component gallery with the Basic group" width="420">
- **Layout backup** (admins): export / import the whole layout as versioned JSON in **Appearance → Layout backup**, with Replace or Merge and one click restore. See [Layout backup](#layout-backup).
- **Wall tablet mode** (off by default): after inactivity a glass screensaver with a clock, the date and a photo fades in and dims the screen; touch or a motion sensor wakes it. Idle time, dimming, photo source and sensor are set in **Appearance → Wall tablet mode**. See [Wall tablet mode](#wall-tablet-mode).
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
<td width="50%" valign="top"><img src="docs/components/climate.png" alt="Climate" width="100%"><br><b>Climate</b> <code>custom:nuvio-ac-card</code><br>Large target temperature with a slider, HVAC modes, fan and swing. Swipe the slider sideways, hold the temperature for details. <code>climate.*</code>.</td>
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

### Rooms, appliances and Home Glass parity (0.7.0)

All of these are in **+ Add** in edit mode, with a preview, a full settings form and an **Advanced configuration (JSON)** field for any other card option (labels, colours, thresholds, actions). Everything is stored in the layout, so Layout backup export and import carry it.

| Component | Card | Settings in the form |
|---|---|---|
| Rooms | `custom:nuvio-areas-card` | room view path; names, icons, order, temperature and humidity sensors and custom rooms come from Appearance, Rooms |
| Room | `custom:nuvio-room-card` | the room to show (or the room from the address) |
| Appliance | `custom:nuvio-appliance-card` | any entity of the device; washer, dryer and dishwasher show state, program, time left and progress |
| Hot water | `custom:nuvio-cwu-card` | water heater, heating state, power, time to heat, consumption, keep temperature, switches |
| Stairs | `custom:nuvio-stairs-card` | bottom and top light and motion sensor, light group, sequence automation |
| Fuel prices | `custom:nuvio-fuel-card` | price sensors with labels and an optional tomorrow change sensor |
| Air conditioning (card) | `custom:nuvio-ac-card` | climate entity, title |
| Energy week | `custom:nuvio-week-card` | consumption and production sensors, days, tap target |
| Phases | `custom:nuvio-phases-card` | power, voltage and current per phase, maximum total and per phase power |
| Solar | `custom:nuvio-pv-card` | power, today, inverter state and temperature, strings |
| Network | `custom:nuvio-net-card` | section (internet, gateway, Wi-Fi, devices, clients), title |
| Home sensors | `custom:nuvio-sensors-card` | device classes, extra and skipped sensors |
| Shortcut | `custom:nuvio-link-card` | title, subtitle, entity, path or URL to open |
| Person | `custom:nuvio-person-card` | person, home and away labels |

**Appearance, Rooms**: rename rooms, set icons and order, hide rooms, choose the temperature and humidity sensor for each room tile (automatic, any sensor, or none), and create custom rooms with any entities, independent of Home Assistant areas. Entities can also be assigned by hand to existing rooms.

**Appearance, Header and navigation**: household title and subtitle (or no household strip), fuel prices in the dashboard header, and the four views on the phone bar.

**Appearance, Background gallery**: add your own images by `/local/` or `https://` address; they show up in Background and in the wall tablet slideshow.

**Appearance, Header and navigation** (0.8.0) also has: the weather entity for the header and an optional sensor with a `forecast` attribute for the hourly strip, the household strip position (left or next to the panel), and a per view table with the icon, a short label for the phone bar, desktop and tablet column count (built in views too), whether the view is in the sidebar and its order there. **Background gallery** has a focal point for the current background.

**Settings** (0.9.0): Appearance is now a separate settings panel with tabs: Appearance, Views, Rooms, Header and navigation, Backgrounds, Screensaver and Backup. The view settings table has proper column labels and turns into labelled cards on a phone.

**More components in + Add** (0.9.0): light with brightness, thermostat, big value, history graph, doors and windows, batteries, vacuum, mini player, clock, sun, note, image or page, and updates. Each one has a live preview, form fields and is included in export and import.

### Planned

Roadmap of next features; the source of truth is [docs/STATUS.md](docs/STATUS.md).

| Feature | Description | Status |
|---|---|---|
| Assist / voice card | talk to Home Assistant Assist from a glass card, with the reply shown inline | done in 0.10.0 |
| Notifications center | persistent notifications, low batteries, open doors and unavailable devices in one panel | planned |
| Energy dashboard integration | read sources and devices from the HA Energy settings instead of manual sensors | planned |
| Energy and bars card fix | render `nuvio-energy-card` and `nuvio-bars-card` correctly outside a fixed-height grid | planned |
| Map card setup | clear hint and fallback when map tiles are unavailable, plus a README screenshot | planned |
| Per-device layouts | different layout for phone, tablet and desktop instead of one shared layout | planned |
| Theme editor | custom glass blur, radius, fonts and colour palettes beyond the accent colour | planned |
| Preset sharing | share layouts and appearance as presets, with an import gallery of community presets | planned |
| Accessibility pass | screen reader labels, focus order and contrast audit for all cards and edit mode | planned |

Already done from the previous roadmap: view editor (Appearance → Views), full Polish / English i18n, config export / import (Appearance → Layout backup), empty-state hints on Home, wall tablet mode (Appearance → Wall tablet mode).

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

## Wall tablet mode

A screensaver for a tablet on the wall. It is **off by default**; admins turn it on in **Appearance → Wall tablet mode** (edit mode) and press **Done** to save.

- **Start after inactivity**: 30 s, 1, 2, 5, 10 or 30 min without touch, mouse or keyboard input (default 2 min).
- **Dimming**: 0 to 90 %, how dark the screen gets under the clock (default 50 %).
- **Photo**: your dashboard background, a slideshow of the bundled backgrounds (crossfade every 45 s) or your own image URL (`https://…` or `/local/…`).
- **Motion sensor**: pick any `binary_sensor`; motion, occupancy and presence sensors are listed first. When it turns `on` while the screensaver is showing, the screen wakes. Without a sensor, only touch wakes it.
- **Wake**: touch, key press or scroll. The first touch only wakes the screen and does not press the tile underneath.
- **Preview screensaver** shows it immediately; touch to close.
- Layout: a large clock in the centre (no panel behind it), the date fixed at the bottom left and, if Home Assistant has a `weather` entity, the current weather (icon, temperature, condition) at the top right. The clock follows your HA time format (12 / 24 h) and language, moves slightly every minute to protect OLED panels, asks the browser to keep the screen on while showing (Screen Wake Lock) and respects reduced motion.
- It only starts on the Nuvio dashboard (not in edit mode, not in a background tab) and is drawn above Home Assistant dialogs.
- Settings are stored per Home Assistant user like the layout. For a dedicated tablet user, sign in as an admin once on the tablet, or move the settings with **Layout backup** (the category *Wall tablet mode*).

## Layout backup

Admins can export and import the whole Nuvio layout from **Appearance → Layout backup** (edit mode).

- **Export** downloads `nuvio-uklad-YYYY-MM-DD.json`; **Copy to clipboard** copies the same JSON. Choose what to include: views and custom views; layout, widgets with their entities, titles, section widths and hidden items; appearance (accent, background, dimming); view panel widths; wall tablet mode settings.
- **Import** accepts a file (picker or drag and drop) or pasted JSON. The file is validated and a summary shows the number of views, widgets, sections and entities, with entities missing on this instance highlighted. Pick the parts to import and **Replace** or **Merge**.
- Before importing, the current layout is kept as a backup; **Restore previous** in the notification (or in the Layout backup section) undoes the import with one click.
- The file is versioned (`format`, `schema`, `nuvio`, `exported`). Older raw layout data is converted automatically; files from a newer schema or damaged files are rejected with a clear message.

## Development

See [DESIGN.md](DESIGN.md) for the UI rules every new feature must meet.


```bash
python3 tools/build.py   # -> dist/nuvio.js
python3 tools/guard.py   # fails if any house-specific id slipped into dist
```

There is no CI/CD: releases and tags are built locally. `tools/release.sh X.Y.Z` bumps the version (`package.json`, README), builds, checks `dist/nuvio.js` (`node --check`) and runs the hardcode guard, commits `chore: release X.Y.Z`, creates the annotated tag `vX.Y.Z`, pushes `main` and the tag, and creates a GitHub release without attached files (HACS then installs the full flat `dist/`):

```bash
./tools/release.sh 0.3.21   # needs a clean tree, gh CLI logged in
```

Only tagging by hand: `git tag -a v0.11.0 -m "Nuvio 0.11.0" && git push origin v0.11.0`.

## Changelog

### 0.11.0
- Changed: Assist is now a glass dialog instead of a card. Open it with the microphone button in the header or the A key; on a phone it slides up as a bottom sheet. The conversation, assistant picker, microphone, suggestions and spoken replies stay, and the conversation continues for the whole session. Close with X, Escape or a tap outside.
- Added: Assist settings in Ustawienia, tab Nagłówek i nawigacja: header button, A shortcut, default assistant, spoken replies, microphone and your own suggestions.
- Changed: Assist is no longer offered in + Dodaj. Existing Assist cards show a small button that opens the dialog.
- Fixed: swiping the settings tabs, a slider, a picker or a horizontally scrolling row no longer switches the dashboard view, and view swipe is off while a dialog is open.

### 0.10.2
- Fixed: the Assist card has its own blurred glass surface, so content behind it no longer shows through. Bubbles, suggestion chips and the input field have stronger contrast.

### 0.10.1
- Fixed: the Assist card title stays visible next to the assistant picker.

### 0.10.0
- Added: Assist card. Talk to Home Assistant Assist from a glass card: text field, microphone (browser speech recognition), assistant picker, replies in chat bubbles, conversation continues across questions, optional spoken replies, suggestion chips. Full form configuration, JSON field and export and import.
- Added: DESIGN.md with the UI rules every new feature must meet.

### 0.9.1
- Changed: the screensaver shows plain white text and icons with a soft shadow, without panels behind them. The wake hint is centered at the bottom with a gentle pulse that respects reduced motion.
- Changed: all sliders use one custom style: slim track, accent fill, white thumb that grows on hover and drag, clear keyboard focus.

### 0.9.0
- Added: 13 new components in + Add: light with brightness, thermostat, big value, history graph, doors and windows, batteries, vacuum, mini player, clock, sun, note, image or page, updates.
- Added: settings panel with tabs (Appearance, Views, Rooms, Header and navigation, Backgrounds, Screensaver, Backup), labelled view settings table.
- Changed: tile sizes S, M and L are real grid spans with dense packing, so smaller tiles sit next to each other.
- Changed: card content scales with the tile size through container queries.
- Changed: fuel price rows in the header settings are stacked cards with shorter sensor names grouped by integration.
- Fixed: the title edit button stays next to the title in full width views.

### 0.8.1
- Fixed: widgets added in edit mode now follow the view column count, so Energy and Network use the full width with 3 columns.

### 0.8.0
- Added: column count for every view on desktop and tablet, including the built in views such as Energy.
- Added: per view icon, short phone bar label and sidebar visibility and order. Long phone bar labels shrink instead of being cut off.
- Added: weather entity choice for the header, automatic choice prefers an entity with a forecast, and an optional forecast sensor (any entity with a `forecast` attribute, for example from MQTT) for the hourly strip.
- Added: household strip position, left or next to the panel.
- Added: background focal point, saved in the layout.
- Fixed: a full width panel (and other per view or appearance settings) could be lost when the dashboard was open in another browser tab, because layout sections were saved as a whole. They are now merged key by key.
- Fixed: in Rooms, an entity under Other that belongs to a custom room shows that room name.

### 0.7.1
- Fixed: room views now use hot water, stairs, entity names and camera settings from Appearance, Rooms (before, only names, icons, order and sensors were applied).
- Fixed: the room view header shows the room name, temperature, humidity and a back button instead of the generic title.
- Fixed: saving Appearance, Header and navigation no longer drops the household people list.

### 0.7.0
- Added: components for everything Home Glass shows, each in + Add with a preview and a full settings form: Rooms, Room, Appliance (washer, dryer, dishwasher with state, program, time left and progress), Hot water, Stairs, Fuel prices, Air conditioning card, Energy week, Phases, Solar, Network, Home sensors, Shortcut and Person.
- Added: every card component has an Advanced configuration (JSON) field, so any card option (labels, colours, thresholds, actions) can be edited in the form.
- Added: Appearance, Rooms: room names, icons, order and visibility, temperature and humidity sensor per room tile (automatic, picked or none), custom rooms with any entities independent of Home Assistant areas, and manual entity assignment.
- Added: Appearance, Header and navigation: household title or no household strip, fuel prices in the dashboard header, and the four views on the phone bar.
- Added: Appearance, Background gallery: your own images saved in the layout, also used by the wall tablet slideshow.
- Changed: Layout backup export and import carry all of the above, and the missing entity check includes room and fuel sensors.

### 0.6.5
- Fixed: wall tablet (screensaver) settings were not saved when another Home Glass based dashboard was installed as a Lovelace resource on the same Home Assistant. Both bundles shared one in-memory layout store, so Nuvio wrote to the other dashboard's key, which has no screensaver section. Nuvio now keeps its own globals, and every build gets a new content-hashed file name.

### 0.6.4
- Changed: the **Climate** card is back to the look from 0.5.0 (large temperature with arrows, the tick slider and the mode buttons); the round dial from 0.6.0 is gone. The touch handling stays: swipe the slider sideways to set the temperature (swiping up or down scrolls the page, a tap jumps to that spot), hold the temperature to open the entity details, tap it to turn a switched-off unit on, hold the arrows to repeat, a light vibration on every step (Home Assistant app or supporting phones), and Page Up/Down, Home/End on the keyboard.

### 0.6.1
- Wall tablet mode: the clock no longer sits on a glass panel. The date is now fixed at the bottom left and, when Home Assistant has a weather entity, the current weather (icon, temperature, condition) appears at the top right.

### 0.6.0
- New look for the **Climate** card: a glass thermostat dial (270° arc) with a cold-to-warm temperature gradient, a draggable knob, a dot for the indoor temperature and a soft glow in the mode colour (orange heating, blue cooling, teal drying) that breathes while the unit is actually working. Mode buttons use the same colours.
- Touch on the Climate card: drag along the arc to set the temperature (the page still scrolls when you swipe through the middle of the dial), hold the centre to open the entity details, tap the centre to turn a switched-off unit on, hold −/+ to repeat. Every step gives a light vibration (Home Assistant app or phones that support it). Keyboard: arrows, Page Up/Down, Home/End.
- Compact climate (room pages): the tick strip is now a glass slider with the temperature gradient. Swipe sideways to set it, tap to jump, swipe up or down to scroll the page.
- Consistency pass across components: inner tiles in Media, Robots, Sensors, Alarm and Cameras use one shared glass surface (same fill and a light top edge) in light and dark mode instead of four slightly different white fills with borders.
- Fixed: on the Rooms view the room name was cut off by the temperature at some widths (e.g. 1440 px); room tiles now grow to fit. Room status dots now use the climate mode colours.

### 0.5.0
- New: **Wall tablet mode** (off by default). After inactivity a glass screensaver with a large clock, the date and a photo fades in and dims the screen; touch, a key press or a motion sensor (any `binary_sensor`, chosen in settings) wakes it. In **Appearance → Wall tablet mode** you set the idle time, dimming level, photo source (dashboard background, slideshow or your own URL) and the sensor, and you can preview it. The clock drifts slightly to protect OLED panels, the screen is kept awake while it shows, reduced motion is respected, and it appears above Home Assistant dialogs. The settings are part of Layout backup.

### 0.4.1
- New look for the first-run wizard: modern glass panel over your background, a step rail on the left with your choices so far (tap a finished step to go back), a live dashboard preview on the welcome screen, smooth step transitions and staggered tiles (reduced motion respected). Rooms get Select all / Clear all, the summary rows open their step, Enter moves to the next step, and colour names follow the chosen language. On phones the steps collapse into a progress bar.
- Fixed: on the welcome screen at wide sizes (e.g. 1440 px) the text under "Welcome to Nuvio" was covered by the photo gradient. The text now sits on the glass, next to the preview.

### 0.4.0
- New: layout backup in Appearance. Export the whole layout to a versioned JSON file or the clipboard, choosing what to include, and import it from a file, drag and drop or pasted text. Import validates the file, shows a summary with views, widgets and entities missing on this instance, offers Replace or Merge, keeps the current layout as a backup with one click Restore previous, converts older data and rejects bad files with a clear message. Admin only.

### 0.3.24
- Fixed: a changed icon now shows in the live preview while editing, not only after saving. Group layouts (List, Grid, Carousel, Compact list) had no icon in the preview header at all, and section previews could change the wrong icon instead of the section header's icon.

### 0.3.23
- Fixed: the icon picker (Icon field) now follows the light and dark theme. In dark mode the list was light with white, barely visible icons; now it is frosted glass in the theme's own colours with clear icons and labels in both modes. It opens and closes with a short animation, the arrow turns while it is open, the list header shows how many icons match the search, a placeholder grid shows while icons load, and the list fades out at the bottom edge. Reduced motion is respected.

### 0.3.22
- Fixed: live previews in the component and card settings sheets are no longer oversized or stretched. A new component is previewed at its natural height and panel width; an existing card at the exact size it has on the page; both are scaled down to fit and centred, without empty space. Tile and group previews keep the panel width instead of spanning the whole sheet.

### 0.3.21
- Changed: removed CI/CD (the GitHub Actions release workflow, including the HACS validation job). Releases and tags are built only locally with `tools/release.sh`.

### 0.3.20
- Added: hover and keyboard focus on the tiles in the More views pop-up (brighter glass, soft shadow, slight lift; press feedback; no lift on touch screens or with reduced motion).

### 0.3.19
- Fixed: the More views pop-up next to the rail now sits clearly above the zoom toolbar and the household panel: denser glass with a stronger blur, a light dim behind it, and the clip used for the opening animation is dropped once it finishes (it switched off the glass blur in some browsers, so content showed through). Clicking outside or pressing Escape closes it.

### 0.3.18
- Fixed: the weather in the header uses the animated icon again (0.3.17 switched it to the still icon by mistake; it was not the cause of the glow band).
- Includes the 0.3.17 changes, which were never tagged: no glow band on half-width panel views, and the tab and rail indicators no longer keep a permanent GPU layer.

### 0.3.17
- Changed: the tab and rail indicators no longer keep a permanent GPU layer (they are promoted only while they animate).

### 0.3.16
- Fixed: Done, Save and other primary buttons commit and close without asking. The Discard changes confirm appears only when closing a form with unsaved changes (card settings, component form) with X, Escape, the backdrop or a swipe; sheets that apply changes live (Appearance, title, Restore hidden, the gallery) never ask.
- Fixed: cancelling edit mode restores the layout correctly again (the unsaved changes check from 0.3.13 overwrote the edit mode snapshot).
- Fixed: the Discard button uses the Home Assistant error colour instead of a fixed red, and the Add tile in edit mode keeps the size of a small tile.

### 0.3.15
- Fixed: the hide panel button switches its icon (eye) and label and reports its state with aria-pressed.
- Fixed: long entity names on tiles no longer get cut at the top and bottom; they wrap to 2 lines with an ellipsis, and unknown values show No data instead of a dash.
- Improved: the size picker is a glass segmented control with size glyphs, equal widths and the labels Small, Medium and Full width, with the selected one in the accent colour.
- Fixed: in edit mode the Add tile flows as the next grid cell, the same size as a small tile, without empty rows; the drag, remove and size handles sit neatly on the tile edges.
- Fixed: all footer buttons in dialogs have the same height and padding, aligned right, and stack full width on phones.
- New: the Icon field has a searchable icon picker with the full MDI list from Home Assistant, recent icons, keyboard navigation and a live preview; typing mdi:name by hand still works.

### 0.3.14
- Fixed: a view or panel with no visible items shows the Empty view state with an Add widget button, live after deleting, hiding, undo or redo, in edit mode and normal mode, on every view type. Undo restores the items and hides it again.
- Fixed: the Undo button in notifications uses the text color that matches the theme accent.

### 0.3.13
- Fixed: the component form opened from card settings goes back to where it was opened from (Back closes it) instead of the gallery. Every edit sheet now uses one navigation stack.
- Improved: typed text, search and selections survive going back and forth, scroll position is kept per step, focus moves to the step title and returns to the control that opened the step. Escape steps back. Closing with unsaved changes asks for confirmation (Discard or Stay), only when something changed. On a phone, swipe down closes only the top level and a swipe from the left edge goes one step back. Slides follow reduced motion settings.
- New: the user menu shows the Nuvio version and an update pill (from the HACS update entity, or GitHub releases checked at most every 6 hours) with a dot on the avatar, plus a reload hint when a newer file is already on the server.

### 0.3.12
- Fixed: navigation in the edit sheets works as a stack. In a nested step (choosing an entity, the component form, the widget style, changing an entity from card settings) the X, Escape and a new back arrow return to the previous step with its state kept; only the X on the top level (the + Add gallery or settings) closes the sheet. Steps slide in and out without the sheet closing and reopening.

### 0.3.11
- Changed: designed previews in the + Add gallery. Every component shows a small mock with sample data, marked as a preview (slider with fill, button, entity rows with toggles, select, stepper, gauge arc, light, sensor value, sparkline, climate, cover, scenes, media player, cameras, power, energy, weather, people, alarm, robots, agenda, map) in the same glass and accent style. A live preview with a real entity is used only when every entity it needs has a known state.
- Changed: components without a matching entity stay selectable, are only slightly dimmed and show one short line (No matching entity) with the required domains in smaller text and a tooltip. Cards have equal heights, previews have one height and long texts are clamped on phone, tablet and desktop.

### 0.3.10
- New: panel width per view. Every view (built in and custom) offers **Narrow panel** (a right column like the main Panel, leaving the left side for the title and background) or **Full width panel** (like Rooms), with small previews. The choice is in the view title sheet (edit mode, title) and in the custom view form, applies live without reopening the dialog and is saved per view. A narrow panel holds at most two columns; on phones the panel is always full width.
- Changed: the empty view hint stays visible until a custom view has three items and sits below the tiles, so a view with a single row no longer looks empty.

### 0.3.9
- Fixed: custom view layouts now really differ. **Grid** keeps equal rows with cards stretched to the row height, **Columns** stacks cards top down in each column in order without aligning rows, **Masonry** places each card in the shortest column, and **Panel** shows the weather on top with two columns. Saved per view and applied after reload.
- Fixed: the view settings dialog updates in place. Choosing a layout, icon or other option no longer closes and reopens the dialog; scroll position, typed text and focus are kept.

### 0.3.8
- New: one glass select for all of Nuvio. Every dropdown (view columns per device, max width, media player source) now uses a glass trigger that matches the inputs and an animated glass list with the blur visible from the first frame, a check mark in the theme accent on the selected option, full keyboard support (arrows, Home, End, Enter, Esc, type to search), ARIA listbox semantics, closing on outside click, flipping up near the bottom edge and larger touch targets on phones. The list renders above sheets and other glass, so it is never clipped. The native select stays underneath as the source of the value.

### 0.3.7
- New: remote fallback for images and fonts. Nuvio loads backgrounds, gallery thumbnails and fonts from the local install first and, if a file fails to load, from jsDelivr pinned to the running version (`cdn.jsdelivr.net/gh/kczepiec/nuvio@v<version>/dist/`). Offline installs keep working with local files.
- Fixed: glass seams on photo backgrounds. Background dimming is now a single overlay instead of a CSS filter on the full screen photo, and the background layers are plain fixed layers again, so blurred elements sample one uniform backdrop.
- Fixed: the rail "More" popover is frosted from the first frame (reveal animation instead of fading opacity, which disabled the blur) and its tiles keep equal height and alignment.
- Fixed: views with the same title or similar paths. The active rail item matches whole path segments (`/nuvio/test` no longer lights up for `/nuvio/test2`), and `rail_overflow` accepts a view path and never maps two entries to one item.

### 0.3.6
- New: section width. The settings of a dashboard section offer **Automatic**, **Full width** or **Half** with a small visual preview; on phones every section is full width. Saved per section.
- New: in edit mode Nuvio checks the server for a newer `nuvio.js` and asks for a reload without cache (Ctrl+Shift+R) when the browser runs an older cached build. The + Add gallery header shows the loaded version.
- Changed: empty-state hint cards use a 16 px radius and a smaller icon tile.
- Fixed: background thumbnails that fail to load show "Image not loaded" instead of a silent gradient, and log the URL in the console.
- Fixed: the selected background thumbnail had a double focus outline; keyboard focus is now one rounded ring in the accent colour, none on mouse click.
- Fixed: background and shade are single full screen GPU layers, so glass elements sample one backdrop (aimed at a vertical seam seen in Chrome on macOS).

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
