<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/final/nuvio-horizontal-mono-63d71e.svg">
    <img src="assets/brand/final/nuvio-horizontal-mono-63d71e.svg" alt="Nuvio" width="300">
  </picture>
</p>

<p align="center"><strong>A glass-style Home Assistant dashboard that builds itself from your home.</strong></p>

<p align="center">
  <a href="https://hacs.xyz"><img src="https://img.shields.io/badge/HACS-Custom-41BDF5?style=flat-square" alt="HACS Custom"></a>
  <img src="https://img.shields.io/badge/Home%20Assistant-2024.8.0%2B-18BCF2?style=flat-square&logo=homeassistant&logoColor=white" alt="Home Assistant 2024.8.0+">
  <img src="https://img.shields.io/badge/version-v2.10.1-a3e635?style=flat-square" alt="v2.10.1">
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
- **Shared dashboard**: by default everyone sees the same dashboard, set up by an administrator. In **Settings → Users** an admin can turn a person off to give them their own layout that they edit themselves. See [Shared dashboard](#shared-dashboard).
- **Polish and English UI with a language picker**: switch in **Settings → Appearance → Language** or from the user menu (top right). The change applies at once, without reloading, and is saved to your HA account. See [Language](#language).
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
<tr>
<td width="50%" valign="top"><img src="docs/components/flow.png" alt="Energy flow" width="100%"><br><b>Energy flow</b> <code>custom:nuvio-flow-card</code><br>Grid, solar, battery and home on one diagram. Glowing dots run along the lines, faster at higher power; the home ring shows where its power comes from and the battery ring shows the charge level. Power sensors (W or kW) for grid, solar and battery, battery level, optional home usage.</td>
<td width="50%" valign="top"></td>
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

### More cards and the form library (1.2.0)

Seven new cards in **+ Add**, each with a live preview and a form. They follow the Home Assistant cards of the same name, in Nuvio glass.

| Card | What it does | Options |
|---|---|---|
| `custom:nuvio-conditional-card` | Shows its cards only when the conditions are met (in edit mode they are always shown) | `cards`, `conditions` (`state`, `state_not`, `numeric_state` with `above` / `below`, `screen` with `media_query`, `user` with `users`, `and`, `or`) |
| `custom:nuvio-glance-card` | Several entities in a row: icon, name and state; tap opens more info | `entities`, `title`, `columns`, `show_name`, `show_state` |
| `custom:nuvio-stat-card` | Minimum, average, maximum and change of a sensor with a sparkline, for 24 hours, 7 or 30 days | `entity`, `name`, `icon`, `hours`, `decimals` |
| `custom:nuvio-humidifier-card` | Target humidity on an arc, current humidity and mode pills | `entity`, `name` |
| `custom:nuvio-purifier-card` | Air purifier: large PM2.5 reading that counts to the new value, air-quality label, air waves around the number (faster in Turbo, slower in Sleep), power and modes with a sliding highlight | `entity` (fan), `pm` (PM2.5 sensor, auto), `name`, `title`, `modes` |
| `custom:nuvio-smartlock-card` | Smart lock: animated padlock in a round button (the shackle lifts when unlocked), hold to unlock with a filling ring, tap to lock, spinning arc while the lock moves, pulse after a change, shake when jammed, battery and door sensor from the same device, open door button when the lock supports it | `entity`, `door`, `battery` (auto), `name`, `title`, `hold` |
| `custom:nuvio-timer-card` | Remaining time of a `timer` on an arc, with start, pause and cancel | `entity`, `name`, `icon` |
| `custom:nuvio-logbook-card` | Recent changes of chosen entities with relative times | `entities`, `title`, `hours`, `max` |
| `custom:nuvio-webpage-card` | Any `https://`, `http://` or `/local/` address in a frame | `url`, `title`, `aspect_ratio` or `height` |

The component forms now use one form library (`hgForm`): text fields, number fields, text areas (code style for YAML and JSON), glass switches, glass selects and a collapsible *Advanced* section, so no browser checkbox, datalist or disclosure triangle is left.

### Layout containers (1.1.0)

Grid, vertical stack and horizontal stack work like in Home Assistant, but in Nuvio glass. They are the first group in **+ Add**, under *Layout*. The form of a container lists its cards: add any component, tile or card from HA, edit a card in its own form, drag to reorder, duplicate, remove, and in a grid set how many columns a card spans. Containers can be nested up to three levels. A card on the panel can be moved into a container from its form, and a card inside a container can be moved back out to the panel.

**Card from HA (YAML)** takes the YAML (or JSON) that the Home Assistant card editor shows under *Show code editor*. A `grid`, `vertical-stack` or `horizontal-stack` becomes the matching Nuvio container with the same cards, any other card is shown as it is. The same conversion happens for these types in the Nuvio page config; add `keep_ha: true` to keep the original Home Assistant card. An example is in [docs/examples/containers.yaml](docs/examples/containers.yaml).

| Card | What it does | Options |
|---|---|---|
| `custom:nuvio-grid-card` | Cards in columns; fewer columns on narrow screens | `cards`, `columns` (1 to 6, 0 = automatic), `min_width`, `square`, `gap`, `glass`, `title`; per card `span` |
| `custom:nuvio-stack-card` | Cards one below another or side by side in one glass; side by side turns vertical below `wrap_below` px | `cards`, `direction`, `gap`, `ratio` (e.g. `[2, 1]`), `wrap_below`, `divider`, `glass`, `title` |

### Generic cards and containers (0.16.0)

Twelve cards built only from the shared glass blocks, so they look like the reference design and work with any entity of the right domain. Each one adapts to its width: small (up to 220 px) hides secondary text, large (from 420 px) shows extra detail. They also work in a regular Home Assistant view, where they blur the background themselves. A ready dashboard built only from them is in [docs/examples/inspiration-dashboard.yaml](docs/examples/inspiration-dashboard.yaml) (works with the HA demo integration).

<img src="docs/components/generic-dashboard.webp" alt="Sample dashboard built from the generic cards" width="100%">

| Card | What it shows | Main options |
|---|---|---|
| `custom:nuvio-hero-card` | Large greeting with the signed-in person's first name and a tagline, optional photo and one state | `title` (`{name}`), `subtitle`, `image`, `entity` |
| `custom:nuvio-toggle-card` | One device in a row: icon, name and state, switch, ⋮ menu | `entity`, `name`, `icon` |
| `custom:nuvio-progress-card` | A value on a thick lime bar, orange or red above thresholds | `entity`, `min`, `max`, `warn`, `bad`, `unit` |
| `custom:nuvio-arc-card` | Brightness, speed, position, volume or a number on a draggable arc | `entity` (light, fan, cover, media player, number) |
| `custom:nuvio-chart-card` | Area, line or bars from any numeric sensor's history, with the latest value | `entity`, `hours`, `style: area / line / bars`, `tone: solar` |
| `custom:nuvio-room-compact-card` | Temperature, humidity, a switch and a brightness ruler | `name`, `temperature`, `humidity`, `entity` |
| `custom:nuvio-actions-card` | A glass pill of round buttons for scenes, scripts, services or links | `actions: [{ entity }, { icon, name, service, data }, { navigate }]` |
| `custom:nuvio-family-card` | Avatars, who is home, a button to add a person | `persons` (empty = everyone) |
| `custom:nuvio-cover-card` | Cover or gate position on a draggable bar, open, stop, close | `entity` |
| `custom:nuvio-lock-card` | Lock state; unlocking asks for confirmation, or for the code when the lock needs one | `entity`, `confirm` |
| `custom:nuvio-fan-card` | Fan speed on the arc and preset modes as pills | `entity` |
| `custom:nuvio-todo-card` | A to-do list: add a task, tick it off | `entity`, `show_done` |
| `custom:nuvio-stack-card` | Several cards in one glass, vertical or horizontal (Nuvio and regular HA cards) | `cards`, `direction`, `glass`, `title` |
| `custom:nuvio-tabs-card` | Pills (Dashboard / Rooms / Devices) that switch between sets of cards | `tabs: [{ label, icon, cards }]` |

All of them are also in the *Add component* gallery of the Nuvio editor.

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
| AC remote | `custom:nuvio-acremote-card` | climate entity, title |
| Energy week | `custom:nuvio-week-card` | consumption and production sensors, days, tap target |
| Phases | `custom:nuvio-phases-card` | power, voltage and current per phase, maximum total and per phase power |
| Solar | `custom:nuvio-pv-card` | power, today, inverter state and temperature, strings |
| Energy flow | `custom:nuvio-flow-card` | grid power (+ import, − export, several sensors are summed, e.g. phases) or separate export sensors, solar power (several are summed, e.g. inverters), batteries each on their own (`battery` and `battery_soc` lists in the same order, or `batteries: [{ power, soc, name }]`, up to 4), home usage (empty = from the balance), invert grid or battery sign |
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
  language: en        # pl | en: dashboard default (a personal choice in Settings still wins)
```

### Language

Nuvio speaks Polish and English. Each person picks their language in **Settings → Appearance → Language** (Automatic / Polski / English) or with the language item in the user menu, which everyone can use, including people without access to settings. The whole dashboard switches at once without reloading the page: navigation, cards, settings, edit mode, toasts, numbers and dates. The choice is stored on this device and in your Home Assistant account, so it follows you to other devices.

Which language is used, first match wins:

1. Your own choice in Settings or the user menu.
2. The `language:` strategy option (dashboard default set in YAML).
3. The language picked in the first-run wizard.
4. Your browser language: Polish if it is Polish, otherwise English.

**Adding a language**: add an entry to `HGLang.LIST` and a dictionary to `HG_I18N` in `src/parts/hg-oss.part.js`, then the wizard texts in `HG_WZ_T`. Strings in cards use `hgTr('Polski', 'English')` pairs in place (see `src/parts/hg-core.part.js`); give `hgTr` a third argument per new language there.

> [!TIP]
> To take over a generated dashboard as plain YAML, use *Take control* in the dashboard editor. All `custom:nuvio-*` cards keep working.

## Presets

Configuration (layout + appearance) can be exported/imported as JSON. Personal presets live outside the repository.

## Shared dashboard

Everyone sees the same Nuvio dashboard by default: the layout, appearance, views, rooms and wall tablet settings an administrator sets up.

- **Who edits**: administrators edit the shared dashboard (edit mode). Other people see it without the edit button.
- **Own layout**: in **Settings → Users** (edit mode, admins only) every Home Assistant user has a switch. Turn a person off and they get their own layout: it starts as a copy of the shared one, the edit button appears for them, and their changes affect only them. Turn them back on to return them to the shared dashboard. Your own account stays on the shared dashboard.
- **Who sees a view**: in **Settings → Views** each view (except Home) has a people button. Every view is visible to everyone by default; turn a person off to hide the view from them, including from their own layout. Their screen reloads on its own to drop the view.
- **Live**: changes to the shared dashboard and to the list reach open screens without a reload.
- **Storage**: the shared layout lives in a hidden storage dashboard `nuvio-shared` (*Nuvio (wspólny układ)*, admins only, not in the sidebar). Only admins can write it; do not edit it by hand. Own layouts stay in Home Assistant user data (`frontend/set_user_data`, key `nuvio_layout`), with a local copy per user. Assist settings are always personal.
- **Upgrading from 1.3.x**: the first time an admin opens Nuvio 1.4.0, their current layout becomes the shared dashboard. Until then everyone keeps their own layout as before.

## Wall tablet mode

A screensaver for a tablet on the wall. It is **off by default**; admins turn it on in **Appearance → Wall tablet mode** (edit mode) and press **Done** to save.

- **Start after inactivity**: 30 s, 1, 2, 5, 10 or 30 min without touch, mouse or keyboard input (default 2 min).
- **Dimming**: 0 to 90 %, how dark the screen gets under the clock (default 50 %).
- **Photo**: your dashboard background, a slideshow of the bundled backgrounds (crossfade every 45 s) or your own image URL (`https://…` or `/local/…`).
- **Motion sensor**: pick any `binary_sensor`; motion, occupancy and presence sensors are listed first. When it turns `on` while the screensaver is showing, the screen wakes. Without a sensor, only touch wakes it.
- **Wake**: touch, key press or scroll. The first touch only wakes the screen and does not press the tile underneath.
- **Screensaver style**: *Clock on photo* (described below) or *Board*: a light or dark board with a large weekday or clock and the date, sunrise and sunset, a countdown to the next all-day event, weather with forecast, upcoming events, now playing, a photo and room temperatures. In Board mode you choose the theme (auto by the sun, light, dark), the heading, which elements are shown, the order of the cards, the weather entity and which calendars and rooms are used.
- **Preview screensaver** shows it immediately; touch to close.
- Layout: a large clock in the centre (no panel behind it), the date fixed at the bottom left and, if Home Assistant has a `weather` entity, the current weather (icon, temperature, condition) at the top right. The clock follows your HA time format (12 / 24 h) and language, moves slightly every minute to protect OLED panels, asks the browser to keep the screen on while showing (Screen Wake Lock) and respects reduced motion.
- It only starts on the Nuvio dashboard (not in edit mode, not in a background tab) and is drawn above Home Assistant dialogs.
- **PIN lock (BETA)**: turn on *PIN lock*, set a PIN of 4 to 8 digits and choose when the screensaver locks (at once, after 1, 5, 15 or 30 min). A locked screensaver does not wake on touch or motion: touching it blurs the photo and shows a round glass PIN pad with the PIN dots above it and a **Lock** button below it, which returns to the screensaver. After 5 wrong PINs the pad waits 30 s (longer after more attempts), and it closes by itself after 20 s without a touch. **Lock screen** in the user menu locks right away, and a reload of the page stays locked. Only a hash of the PIN is stored. The lock keeps the tablet from casual use and does not replace the Home Assistant password.
- Settings are part of the layout: on the shared dashboard they apply to everyone, and a person with their own layout has their own. See [Shared dashboard](#shared-dashboard).

## Layout backup

Admins can export and import the whole Nuvio layout from **Appearance → Layout backup** (edit mode).

- **Export** downloads `nuvio-uklad-YYYY-MM-DD.json`; **Copy to clipboard** copies the same JSON. Choose what to include: views and custom views; layout, widgets with their entities, titles, section widths and hidden items; appearance (accent, background, dimming); view panel widths; wall tablet mode settings.
- **Import** accepts a file (picker or drag and drop) or pasted JSON. The file is validated and a summary shows the number of views, widgets, sections and entities, with entities missing on this instance highlighted. Pick the parts to import and **Replace** or **Merge**.
- Before importing, the current layout is kept as a backup; **Restore previous** in the notification (or in the Layout backup section) undoes the import with one click.
- The file is versioned (`format`, `schema`, `nuvio`, `exported`). Older raw layout data is converted automatically; files from a newer schema or damaged files are rejected with a clear message.

## Development

See [DESIGN.md](DESIGN.md) for the UI rules every new feature must meet.


```bash
npm install              # once: esbuild, used to minify the bundle
python3 tools/build.py   # -> dist/nuvio.js
python3 tools/guard.py   # fails if any house-specific id slipped into dist
```

### Source layout

The source is plain JavaScript files that `tools/build.py` joins, in a fixed order, into one bundle (one shared scope, no imports):

| Folder | Content |
|---|---|
| `src/parts/hg-core`, `hg-styles`, `hg-select`, `hg-oss` | base class `HGBase`, theme tokens, glass select, shared helpers |
| `src/parts/shared/` | helpers used by more than one card (weather, calendar, rooms model, generic controls…) |
| `src/parts/cards/` | one card per file, for example `cards/light-card.part.js` |
| `src/parts/hg-page`, `hg-edit`, `hg-wall`, `hg-users`… | dashboard page, edit mode, wall tablet mode, shared dashboard users, backup, Assist |

A new card goes into `src/parts/cards/<name>-card.part.js` and is added to the `CARDS` list in `tools/build.py`. Load order matters: code that runs when the bundle loads (for example `class X extends Y`) may only use what an earlier file defines.

There is no CI/CD: releases and tags are built locally. `tools/release.sh X.Y.Z` bumps the version (`package.json`, README), builds, checks `dist/nuvio.js` (`node --check`) and runs the hardcode guard, commits `chore: release X.Y.Z`, creates the annotated tag `vX.Y.Z`, pushes `main` and the tag, and creates a GitHub release without attached files (HACS then installs the full flat `dist/`):

```bash
./tools/release.sh 0.3.21   # needs a clean tree, gh CLI logged in
```

Only tagging by hand: `git fetch origin && git tag -a v2.10.1 origin/main -m "Nuvio 2.10.1" && git push origin v2.10.1`.

## Changelog

### 2.10.1
- Fixed: in **Settings > Header and navigation** the title and subtitle of the household strip (the people avatars) are saved again. Before, the changes were lost when you closed the sheet with **Done**; now Done saves them, the strip updates right away without a page reload and the section shows a live preview. A new row links to the header editor of the current view.
- Fixed: the **Energy · week** chart is much taller and easier to read. Its height grows with the card size (S, M, L), the bars are wider, production uses its own amber colour and small values stay visible, and the day and value labels are larger.

### 2.10.0
- New: the header of every view can be edited in edit mode. Tap the lime pencil next to the title to set the title, subtitle and an optional icon, show or hide the whole header or only the subtitle, and add shorter versions for phone and tablet. This works in all views, including Rooms and the single room view: there `{room}` inserts the room name, an empty subtitle keeps the live temperature and room status, and the icon defaults to the room icon. A hidden header stays visible, faded and marked "Header hidden", while editing. Headers are saved in the layout and included in export and import.
- Fixed: the last untranslated texts now follow the selected language (the shared layout dashboard, the default Media card title and the card error message). A new check in the build fails when any text has no Polish or English version.

### 2.9.0
- New: language picker in **Settings → Appearance → Language** (Automatic / Polski / English) and in the user menu for everyone. Switching is instant, without a page reload, and the choice is saved per person (this device and the HA account). The default is now the browser language (Polish or English, otherwise English) instead of the HA profile language.

### 2.8.4
- Fixed: the robots card now shows each maintenance sensor with its own unit. Before, every value was shown as a percentage, so a main brush with 255 h left read 255%. Sensors in `%` keep the wear bar; sensors in hours, days or other units show the value and unit without a bar. The last cleaning values (time, area, total) also take their unit from the entity.

### 2.8.3
- Fixed: the `language:` strategy option now always wins. Before, it was ignored once the wizard (or saving views or rooms) had stored a language, so the dashboard could stay in Polish even with `language: en`.

### 2.8.2
- Fixed: while the PIN pad is open on the Glass Minimal screensaver the screen is no longer darkened. The background, content and assistant orb are blurred instead, and the pad stays easy to read.

### 2.8.1
- Fixed: the PIN pad on the Glass Minimal screensaver now opens on its own layer above a blurred screensaver, like on Clock on photo, instead of on top of the clock and cards. Tapping the orb while locked asks for the PIN first and then opens Assist.

### 2.8.0
- New: screensaver style **Glass Minimal** (Settings > Screensaver): a big clock with the date, weather with a 3D icon, now playing with the album art, a background sphere, the assistant orb and the family row. All screensavers are picked from a gallery of live previews, each showing the whole screen scaled down. Tapping the orb opens Assist straight from the screensaver (can be turned off).
- Configurable: gradient colours, orb (on or off, colours, intensity), background sphere, own image from the gallery or an upload, dimmer at night, date format, avatar, clock format, size and position, date, weather and now playing on or off, family (who, grey when away), hint text and reduced motion. Settings are saved per Home Assistant user and included in export and import. Earlier Carousel and Bento choices open as Minimal.
- All cards now share one glass background; the separate warm tint on the solar, energy, power and phases cards is gone.
- The 3D images ship in dist as `nuvio-3d-*.webp` (Fluent Emoji 3D by Microsoft, MIT licence).

### 2.7.0
- New: smart lock card (`custom:nuvio-smartlock-card`, **+ Add → Smart lock**). An animated padlock in a round button: hold it to unlock while a ring fills, tap to lock. A spinning arc shows the lock moving, a pulse confirms the new state and the padlock shakes when the lock is jammed. Battery and door sensor are found on the same device, and an Open door button appears when the lock supports it. Locks with a code ask for it first.

### 2.6.1
- Air purifier card: the PM2.5 sensor is taken from the same device as the purifier (also sensors named pm2_5 without a device class, and the older xiaomi_miio aqi attribute), so the card no longer shows another sensor in the house. The reading also follows a sensor that appears after Home Assistant starts.

### 2.6.0
- New: air purifier card (`custom:nuvio-purifier-card`, **+ Add → Air purifier**). Large PM2.5 reading that counts step by step to a new value, label and color from air quality (clean, good, moderate, poor, very poor), air waves spreading from the number at a speed that follows the mode, power switch and preset modes with a sliding highlight. The PM2.5 sensor is found automatically or chosen in the form.

### 2.5.1
- Now playing card on the board matches the widgets: light blurred background with no border, white text and icons. A title too long for the card scrolls (marquee).

### 2.5.0
- Board widgets look like iPhone lock-screen widgets: light blurred background with no border, white text and white icons (weather uses white symbols, room gauges are white).
- Wall tablet settings: widgets under the clock are one list with up, down and remove; hidden widgets come back with "Add widget". Weather, calendars, rooms, the motion sensor and notify services are lists with an "Add" button that opens a searchable dropdown.
- Icon field: clicking anywhere on the field opens the icon list, and typing filters it.
- Vertical stack no longer collapses on iPhone (Safari).
- "Sensor with chart" inside a stack shows the chart again, and tile names no longer break mid-word.

### 2.4.0
- **Board redesigned like the iPhone lock screen**: date and a large thin clock centered at the top, under it a row of small glass widgets on the photo (weather with high/low and rain chance, next sunrise or sunset, countdown, the current and next event with "in 18 min", and room temperatures as round gauges with humidity), and at the bottom the notification stack and a compact Now Playing player. Everything is compact, so nothing gets cut off on short screens; on a phone the widgets go two per row. The heading defaults to the time; the photo card is gone because the photo is the background (photo source is now available for the board too).

### 2.3.0
- **Notifications on the screensaver**: messages sent with notify to this device (a legacy `notify.mobile_app_…` service or `notify.send_message` with a `notify.*` entity) appear on the screensaver as an iPhone-style stack: the newest card on top with the next ones peeking out below, a tap expands the stack into a list (Show less / clear), and a tap on a card shows its full text. Tapping notifications doesn't wake the screen; a normal wake marks them as read. Pick the services under Wall tablet mode → Notifications on this device (stored per device). Requires an admin account, because it listens to `call_service` events.

### 2.2.0
- **Board redesigned as widgets**: big bold date over the dashboard photo, sunrise and sunset as plain icon lines, and one row of equal glass widgets at the bottom (weather, coming up, now playing, rooms), StandBy style. No more boxes inside boxes: events have a thin color bar, rooms are a clean list with a colored icon and a large light temperature, widget titles are small uppercase labels. Weather moved into the widget row with a compact forecast. On a phone the widgets stack under the header.

### 2.1.1
- **Board polish**: cards no longer stretch with empty space; the widgets dock at the bottom and the photo stays visible in the middle. Weather is a compact card in the top right. Now Playing is a compact widget with a cover thumbnail. Light glass is cleaner white and dark glass is smoky instead of grey haze. The photo card only shows when there is more than one photo (otherwise it repeated the background). Rooms on a phone are tiles with the full name. Stronger shade under the header for contrast on bright photos.

### 2.1.0
- **Board screensaver in premium glass**: the board now sits on the dashboard photo (same slideshow, Ken Burns and dimming as the photo screensaver), with frosted glass cards, light edges and soft shadows like the rest of Nuvio; white date header over the photo, glass chips, accent badge for the next event. "Auto" theme now follows the dashboard.
- **Phone layout**: on a portrait phone the board is a single column (photo card hidden, since the photo is the background), rooms show as a two-column grid with humidity under the name, and list rows that don't fit are hidden whole instead of being cut in half. Cards with no room left are skipped, so nothing is ever clipped.

### 2.0.0
- **Screensaver "Board" (new)**: a second screensaver style next to the clock on a photo. It shows a large weekday or clock with the date, sunrise and sunset, a countdown to the next all-day event (for example "Halloween in 17 days"), weather with an hourly forecast (daily when the service has no hourly data), upcoming events for the next two weeks, now playing, a photo (dashboard background, slideshow or your own address) and a list of room temperatures with humidity. Everything is configurable in Settings → Screensaver: board theme (auto by the sun, light, dark), heading (weekday or time), which elements are shown, the order of the cards, the weather entity, which calendars and which rooms are used. Works in landscape and portrait, with the PIN lock and with motion wake-up.
- **Vertical stack (fix)**: cards in a vertical stack take their natural height; before, a card could be squeezed to a narrow strip.

### 1.9.1
- **AC remote**: changing the mode (for example cooling to heating) fades the card, airflow, slider thumb and tiles smoothly into the new colour, and the unit glows briefly in the new colour.

### 1.9.0
- **Media player (redesign)**: players in Multimedia and in rooms use a large Now Playing layout: artwork as the background (its colour tints the card), source and state line, big title and artist, progress with times, shuffle / previous / large play / next / repeat, and a volume row with − and + plus Rooms (join speakers into a group), Source and Sound chips when the player supports them. On narrow cards shuffle and repeat hide and chips show only icons.
- **AC remote**: on screens 700 px and wider the Mode, Fan, Sleep and Airflow tiles open a dropdown menu next to the tile (arrow keys work, a second tap closes it); phones keep the bottom panel.

### 1.8.1
- **Room editing (fix)**: rooms lay out cards in the same grid as the other views, so edit mode and the saved layout look the same, in the wide view and in the side panel. Before, the wide room view used a separate column layout and cards jumped around after saving.
- **Room gallery (fix)**: + Add in a room shows every component, containers included, and the component settings offer the size.

### 1.8.0
- **AC remote (new component)**: a separate card in + Add styled like an AC remote app. The unit shows animated airflow (blue when cooling, orange when heating, faster at higher fan speed, sweeping when the louvers swing), a large setpoint, a cold to warm slider with − and +, power and Eco. Mode, Fan, Sleep and Airflow tiles open a bottom panel with the options; the card only shows what the unit supports. Works in sizes S, M and L and in light and dark themes.

### 1.7.3
- **Add component gallery (fix)**: thumbnails always use the sample previews; scaled-down live cards were cramped, empty (air conditioning) or showed a random device (robots, sensor chart, scene). Reworked the solar, rooms, power, appliance, stairs, updates, weather and mini player previews so nothing is cut off.

### 1.7.2
- **Cards next to each other (fix)**: components added in edit mode are now separate cards in the view grid, so they can be dragged between and next to the default cards (also resized and removed in place). Simple entity tiles stay together in their block.
- **Weather card (fix)**: in size S the icon and temperature sit in the top row with the description below, sunrise and sunset no longer overlap, the temperature line lines up with the hours, few hours spread over the full width, the strip fades at the edges, and the sun dot stays round in L.
- **Household and Energy · week in S (fix)**: the counter sits above the avatars and zones go under names; the two totals sit side by side and only today's bar shows its value.
- **Add component gallery (fix)**: previews for light, thermostat, value, history, openings, batteries, vacuum, mini player, clock, sun, note, image and updates, plus a refreshed weather preview.

### 1.7.1
- **Faster pages (fix)**: the scroll-hint button on wide screens no longer bobs forever (its glass blur was re-rendered every frame); only its icon bobs three times. Without the energy flow card a page now idles at 60 fps instead of about 25 on a 6x slower CPU.
- **Lighter energy flow card (fix)**: no blur inside the card, no glow on the moving dots, no spinning sun, animations stop while the card is off-screen, and the diagram is re-fitted only when its layout changes.

### 1.7.0
- Added: the **Energy flow** card takes several sensors per source. Grid, solar, export and home sensors are summed (for example three phases or two inverters), and each battery gets its own circle with its level, name and flow, joined by a bus under the diagram (up to 4). Tapping a circle with several sensors lets you pick which one to open.

### 1.6.0
- Added: **Energy flow** card (`custom:nuvio-flow-card`): grid, solar, battery and home on one glass diagram with dots that flow along the lines, faster at higher power. The grid shows import or export, the battery its level and whether it charges, and the home ring and the legend show how much power comes from solar, grid and battery. It is in **+ Add** with a live preview, and the Energy view puts it on top when it finds grid and solar or battery power sensors.

### 1.5.1
- Fixed: closing the Assist window with X left its messages, suggestions and input on the screen without the glass behind them. The closed window is now removed completely, and the conversation is kept for the next opening.

### 1.5.0
- Added: per-person view visibility in **Settings → Views**. Every view is visible to everyone by default; an admin can hide a view from chosen people, and the row shows who does not see it. It also applies to people with their own layout, and their open screen reloads to drop the view.

### 1.4.0
- Added: shared dashboard. By default everyone sees the same dashboard, set up by an administrator; non-admins no longer get an empty default layout. The first admin to open 1.4.0 turns their layout into the shared one.
- Added: **Settings → Users** for admins, with a switch per Home Assistant user. A person turned off gets their own layout, starting as a copy of the shared one, and can edit it themselves.
- Added: changes to the shared dashboard reach open screens live.
- Fixed: Assist settings are now saved to Home Assistant instead of being lost on the next layout save.

### 1.3.1
- Added: unlock animation for the PIN lock. The padlock opens, the PIN dots glow green, the keys drift outwards from the centre, a soft wave of light spreads and the blurred screensaver lifts away to reveal the dashboard. Reduced motion gets a short fade.

### 1.3.0
- Added: PIN lock for the screensaver (BETA) in **Appearance → Wall tablet mode**: PIN, lock delay and on/off. A locked screensaver shows a round glass PIN pad over the blurred photo, with the PIN dots above it and a **Lock** button below it.
- Added: *Lock screen* in the user menu when the PIN lock is on. A locked screen stays locked after a page reload.

### 1.2.1
- Fixed: tablets in landscape (from 900 px wide and a 1.2 aspect ratio, like an iPad held sideways) use the desktop layout again instead of mixing the phone tab bar with the side rail and stretching the panels. The tablet layout stays for portrait and squarer windows, and its scale is now also limited by the window height.

### 1.2.0
- Added: seven cards: conditional (`custom:nuvio-conditional-card`), glance, statistics, humidifier, timer, logbook and web page, each in **+ Add** with a live preview. HA `conditional` cards become the Nuvio conditional card.
- Added: *Turn kiosk mode off* in the user menu when Kiosk Mode is installed (admins only). It reloads with `?disable_km` and keeps it while you move between views in this tab; the same item turns it back on.
- Added: a form library (`hgForm`, `nuvio-check` switch) used by the component forms and the backup editor; browser datalists are replaced by the glass suggestion list.
- Changed: cards, tiles and inner panels in light mode are less transparent.
- Changed: the slider card also controls a humidifier's target humidity.

### 1.1.0
- Added: layout containers like in Home Assistant: grid (`custom:nuvio-grid-card`), vertical stack and horizontal stack, in a new *Layout* group of **+ Add** with live previews.
- Added: a container's form lists its cards. Add any component, tile or HA card, edit each card in its own form, drag to reorder, duplicate, remove and set the column span in a grid. Containers nest up to three levels.
- Added: move a card from the panel into a container from its form, and move a card from a container back out to the panel.
- Added: *Card from HA (YAML)* pastes a card from the Home Assistant code editor. HA `grid`, `vertical-stack` and `horizontal-stack` become Nuvio containers there and in the page config (`keep_ha: true` keeps the HA card).
- Changed: the stack card has a gap, width ratio for side by side cards, a width below which it turns vertical, and dividers that can be turned off.

### 1.0.1
- Changed: the Assist window uses the same glass, accent colour and motion as the other Nuvio windows, in the light and the dark scheme. Your messages, the typing dots, the microphone and the focused field all follow the accent colour.
- Changed: the assistant (model) picker sits inside the message field on the right, with the name shortened when it is too long. The chosen assistant is remembered and also becomes the default in the settings.
- Fixed: in the light scheme the settings and editor windows were too transparent over a busy background.
- Changed: weather details open in the shared Nuvio window, with the same blur and opening and closing animation as other dialogs.

### 1.0.0
The new design is complete: every card is built from the shared glass blocks, updates live and adapts to small, medium and large sizes. This release finishes the work with speed improvements.
- Changed: the bundle is minified, 1253 KB down to 1033 KB (307 KB instead of 366 KB when the server compresses it). Saved layouts and settings are not affected.
- Changed: cards outside the visible part of the page no longer redraw on every state change. They catch up once, just before they scroll into view. On a phone with the sample dashboard a full round of sensor changes now costs about 3.3 ms instead of 4.2 ms.
- Changed: the history, network and editor charts use the shared history store, so the same sensor is fetched from Home Assistant once for all of them.
- Changed (development): `tools/build.py` minifies with esbuild when it is installed (`npm install`); without it the build still works and writes an unminified bundle.

### 0.16.0
- Added: twelve generic cards built from the shared glass blocks: greeting, toggle tile, progress bar, arc, chart, compact room, quick actions, family, cover, lock, fan and to-do list. Each works with any entity of the right domain and adapts to small, medium and large widths. See *Generic cards and containers* above.
- Added: two containers for building dashboards: a stack (several cards in one glass, vertical or horizontal) and tabs (pills that switch between sets of cards). Both accept Nuvio cards and regular Home Assistant cards.
- Added: a sample dashboard made only from the new cards, `docs/examples/inspiration-dashboard.yaml`, modelled on the reference design.
- Added: the new cards in the *Add component* gallery of the editor, with previews.
- Changed: Nuvio cards placed in a regular Home Assistant view blur and tint the background themselves, so they look like glass instead of a faint film. Inside the Nuvio page nothing changes (the panel still blurs once for all cards).
- Added: dialogs can return what was typed into their fields (`hgOverlay.dialog({ collect: true })`), and Enter in a field presses the main button. The lock card uses it for lock codes.
- Added (development): one shared history store (`src/parts/ui/history.part.js`), so several cards with the same sensor and period ask Home Assistant once.

### 0.15.0
- Changed: every card now updates live, including the light, lamp, slider, air conditioning, alarm, assistant, robot and room cards. A state change no longer rebuilds these cards, so an open media player or camera inside a room card keeps playing, and the code field in the alarm card keeps what you typed.
- Changed: buttons, switches and icon circles in all general cards use the same glass, glow and spring motion as the new building blocks. Icon circles are round, active buttons glow softly in the accent colour, and switches stretch slightly while pressed.
- Changed: inner corners follow the design tokens: cards 24 px, tiles and tracks inside cards 16 px, small chips 12 px, the same at every card size.

### 0.14.0
- Changed: one look and one motion for every window above the dashboard. Confirmations (for example "Turn everything off?") are now glass windows that grow in softly over a blurred background, keep keyboard focus inside, return it to the button you came from, and close with Escape. They also appear above the first-run wizard, where they used to be hidden behind it.
- Added: glass tooltips. Icon buttons and elements with a hint show a small white label after a short hover or keyboard focus, instead of the browser's grey tooltip. Hints that only repeat the visible text are skipped.
- Changed: notifications at the bottom of the screen use the shared motion tokens and now stay above open windows.
- Added (development): `hgOverlay` in `src/parts/ui/overlay.part.js` with `dialog`, `alert`, `sheet` (from the bottom on phones, from the side on wide screens, drag down to close), `popover`, `menu` (arrow keys, checked items), `toast` and `tip`. `HGConfirm.ask` keeps its signature and now uses `hgOverlay.alert`. The notification stack moved to `src/parts/ui/toast.part.js`. The gallery page shows every overlay.

### 0.13.0
- Changed: cards now update live. When a device changes state, only the parts of the card that changed are updated instead of redrawing the whole card, so bars and switches glide to the new value, focus and scroll position stay, and fast sensors no longer make cards flicker. Cards with their own drag controls (light, AC, slider, lamp, room) keep the previous behaviour for now.
- Changed: switches move with a soft spring and stretch slightly while pressed.
- Added (development): shared building blocks in `src/parts/ui/` (icon button, pill, tabs, switch, header, big value, progress bar, arc, area chart, avatars) and a gallery page `tests/ui-gallery.html`.

### 0.12.0
- Changed: new glass look for cards, panels and floating controls, closer to the reference design. Glass now has a soft light reflection from the top left corner, a thin bright rim that is stronger at the top, and a deeper soft shadow. In the dark scheme the panel behind the cards is darker, so cards stand out more.
- Added (development): design tokens for shape, glass, motion and type in `src/theme_head.js`, described in DESIGN.md.

### 0.11.2
- Changed (development): every card now lives in its own source file in `src/parts/cards/` (57 files instead of 14), and helpers shared by several cards are in `src/parts/shared/`. The dashboard works exactly as before: the built bundle contains the same code. This is the first step of the new component library and design.

### 0.11.1
- Fixed: on tablets (iPad and other touch screens from 768 to 1180 px, both orientations) the dashboard uses the tablet layout, where the page scrolls instead of the glass panel. Room views no longer clip cards at the top, overlap columns or show a misplaced blurred block; they use a grid of up to two columns.
- Fixed: the assistant picker list in the Assist dialog opens right under its button instead of somewhere else on the screen, and the dialog is centred with more room for the picker label.

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
