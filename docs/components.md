# Components

Nuvio ships its cards as custom elements. This page lists every card, its entities and its options. Back to the [README](../README.md).

Every card can be used on its own as `custom:nuvio-<name>-card` (for example in a regular dashboard after *Take control*). Screenshots: dark theme, default background, demo data.

<details open>
<summary><b>Home & climate</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="components/weather.png" alt="Weather" width="100%"><br><b>Weather</b> <code>custom:nuvio-weather-card</code><br>Current conditions, hourly forecast and sunrise/sunset; tap for daily details. <code>weather.*</code>, optional temperature sensor, <code>sun.sun</code>.</td>
<td width="50%" valign="top"><img src="components/climate.png" alt="Climate" width="100%"><br><b>Climate</b> <code>custom:nuvio-ac-card</code><br>Large target temperature with a slider, HVAC modes, fan and swing. Swipe the slider sideways, hold the temperature for details. <code>climate.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="components/light.png" alt="Light" width="100%"><br><b>Light</b> <code>custom:nuvio-light-card</code><br>Brightness slider for one light. <code>light.*</code>.</td>
<td width="50%" valign="top"><img src="components/switch.png" alt="Switch" width="100%"><br><b>Switch</b> <code>custom:nuvio-switch-card</code><br>Glass toggle as a row or a tile. <code>switch.*</code>, <code>input_boolean.*</code>, <code>fan.*</code> and other on/off entities.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="components/scenes.png" alt="Scenes & scripts" width="100%"><br><b>Scenes & scripts</b> <code>custom:nuvio-scenes-card</code><br>Several scenes or scripts as buttons with a confirmation animation. <code>scene.*</code>, <code>script.*</code>.</td>
<td width="50%" valign="top"><img src="components/script.png" alt="Script" width="100%"><br><b>Script</b> <code>custom:nuvio-script-card</code><br>A single tile that runs one script. <code>script.*</code>, <code>scene.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="components/sensors.png" alt="Sensors" width="100%"><br><b>Sensors</b> <code>custom:nuvio-sensors-card</code><br>Auto-discovered motion, occupancy, door, window, moisture and other binary sensors with filters. <code>binary_sensor.*</code>.</td>
<td width="50%"></td>
</tr>
</table>
</details>

<details open>
<summary><b>Energy</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="components/power.png" alt="Power now" width="100%"><br><b>Power now</b> <code>custom:nuvio-power-card</code><br>Current power with a sparkline of the last hours. <code>sensor.*</code> with <code>device_class: power</code>.</td>
<td width="50%" valign="top"><img src="components/phases.png" alt="Phases" width="100%"><br><b>Phases</b> <code>custom:nuvio-phases-card</code><br>Power, voltage and current per phase with load bars. Power / voltage / current sensors per phase.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="components/energy-stats.png" alt="Energy statistics" width="100%"><br><b>Energy statistics</b> <code>custom:nuvio-energy-stats-card</code><br>Consumption vs production for today, this week and this month with a chart. Long-term statistics or the HA Energy dashboard settings.</td>
<td width="50%" valign="top"><img src="components/week.png" alt="Energy week" width="100%"><br><b>Energy week</b> <code>custom:nuvio-week-card</code><br>Grid consumption and PV production for the last 7 days. Energy statistics.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="components/solar.png" alt="Solar" width="100%"><br><b>Solar</b> <code>custom:nuvio-solar-card</code><br>PV production over the last days as an area chart. One energy statistic plus an optional today sensor.</td>
<td width="50%" valign="top"><img src="components/pv.png" alt="Photovoltaics" width="100%"><br><b>Photovoltaics</b> <code>custom:nuvio-pv-card</code><br>Inverter state, power now, energy today, strings and temperature. Inverter sensors.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="components/flow.png" alt="Energy flow" width="100%"><br><b>Energy flow</b> <code>custom:nuvio-flow-card</code><br>Grid, solar, battery and home on one diagram. Glowing dots run along the lines, faster at higher power; the home ring shows where its power comes from and the battery ring shows the charge level. Power sensors (W or kW) for grid, solar and battery, battery level, optional home usage.</td>
<td width="50%" valign="top"></td>
</tr>
</table>
</details>

<details open>
<summary><b>Media & cameras</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="components/players.png" alt="Media players" width="100%"><br><b>Media players</b> <code>custom:nuvio-players-card</code><br>All players with artwork, title, progress, transport, volume and source. <code>media_player.*</code> (auto-discovered).</td>
<td width="50%" valign="top"><img src="components/media.png" alt="Media player" width="100%"><br><b>Media player</b> <code>custom:nuvio-media-card</code><br>Compact card for a single player. <code>media_player.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="components/camera.png" alt="Camera" width="100%"><br><b>Camera</b> <code>custom:nuvio-camera-card</code><br>Snapshot refreshed every few seconds, live view on tap. <code>camera.*</code>.</td>
<td width="50%" valign="top"><img src="components/cameras.png" alt="Cameras" width="100%"><br><b>Cameras</b> <code>custom:nuvio-cameras-card</code><br>Working cameras as large tiles, unavailable ones collapsed into chips. <code>camera.*</code>.</td>
</tr>
</table>
</details>

<details open>
<summary><b>People & calendar</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="components/people.png" alt="Household" width="100%"><br><b>Household</b> <code>custom:nuvio-people-card</code><br>Everyone with avatar, zone and time since the last change. <code>person.*</code>, optional <code>zone.*</code>.</td>
<td width="50%" valign="top"><img src="components/person.png" alt="Person" width="100%"><br><b>Person</b> <code>custom:nuvio-person-card</code><br>One person with avatar and current zone. <code>person.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="components/agenda.png" alt="Agenda" width="100%"><br><b>Agenda</b> <code>custom:nuvio-agenda-card</code><br>Upcoming events grouped by day, colour per calendar. <code>calendar.*</code>.</td>
<td width="50%" valign="top"><img src="components/month.png" alt="Month" width="100%"><br><b>Month</b> <code>custom:nuvio-month-card</code><br>Month grid with event dots and the selected day list. <code>calendar.*</code>.</td>
</tr>
</table>
</details>

<details open>
<summary><b>Security & devices</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="components/alarm.png" alt="Alarm" width="100%"><br><b>Alarm</b> <code>custom:nuvio-alarm-card</code><br>Alarm state and arm/disarm modes based on supported features, with a code keypad. <code>alarm_control_panel.*</code>.</td>
<td width="50%" valign="top"><img src="components/robots.png" alt="Robots" width="100%"><br><b>Robots</b> <code>custom:nuvio-robots-card</code><br>Vacuums and mowers: state, start/dock/locate, suction and last clean. <code>vacuum.*</code>, <code>lawn_mower.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="components/net.png" alt="Network" width="100%"><br><b>Network</b> <code>custom:nuvio-net-card</code><br>Internet status, latency and speed; other sections cover gateway, access points, Wi-Fi and clients. UniFi entities.</td>
<td width="50%"></td>
</tr>
</table>
</details>

<details open>
<summary><b>Rooms & navigation</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="components/areas.png" alt="Rooms" width="100%"><br><b>Rooms</b> <code>custom:nuvio-areas-card</code><br>Every HA area with temperature, humidity, lights, motion and climate. Area registry.</td>
<td width="50%" valign="top"><img src="components/room.png" alt="Room" width="100%"><br><b>Room</b> <code>custom:nuvio-room-card</code><br>All entities of one area grouped by kind (lights, climate, covers, switches…). Opened as <code>?area=<id></code>. An empty room offers Import from area or Create custom layout.<br><img src="components/empty-room.png" alt="Empty room: import from area" width="100%"></td>
</tr>
<tr>
<td width="50%" valign="top"><img src="components/link.png" alt="Link" width="100%"><br><b>Link</b> <code>custom:nuvio-link-card</code><br>Navigation or action tile. Any path or action.</td>
<td width="50%"></td>
</tr>
</table>
</details>

<details open>
<summary><b>General controls</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="components/slider.png" alt="Slider" width="100%"><br><b>Slider</b> <code>custom:nuvio-slider-card</code><br>Slider for brightness, volume, fan speed, cover position or a numeric value, horizontal or vertical. <code>light.*</code>, <code>media_player.*</code>, <code>fan.*</code>, <code>cover.*</code>, <code>valve.*</code>, <code>input_number.*</code>, <code>number.*</code>.</td>
<td width="50%" valign="top"><img src="components/button.png" alt="Button" width="100%"><br><b>Button</b> <code>custom:nuvio-button-card</code><br>Button that runs a script, scene, button or any action, as a tile or a pill, with a Done confirmation. <code>script.*</code>, <code>scene.*</code>, <code>button.*</code>, <code>input_button.*</code>, <code>automation.*</code>, or any <code>tap_action</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="components/entities.png" alt="Entities" width="100%"><br><b>Entities</b> <code>custom:nuvio-entities-card</code><br>Entity list where each row shows a switch, a Run button or a value. <code>light.*</code>, <code>switch.*</code>, <code>fan.*</code>, <code>input_boolean.*</code>, <code>script.*</code>, <code>scene.*</code>, <code>button.*</code>, <code>sensor.*</code>, <code>binary_sensor.*</code> and other read-only entities.</td>
<td width="50%" valign="top"><img src="components/select.png" alt="Select" width="100%"><br><b>Select</b> <code>custom:nuvio-select-card</code><br>Option picker shown as chips or a list. <code>input_select.*</code>, <code>select.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="components/stepper.png" alt="Stepper" width="100%"><br><b>Stepper</b> <code>custom:nuvio-stepper-card</code><br>Counter with increment, decrement and reset, or step a numeric value up and down. <code>counter.*</code>, <code>input_number.*</code>, <code>number.*</code>.</td>
<td width="50%" valign="top"><img src="components/gauge.png" alt="Gauge" width="100%"><br><b>Gauge</b> <code>custom:nuvio-gauge-card</code><br>Arc gauge showing a sensor value, with a default range chosen by unit. <code>sensor.*</code>, <code>input_number.*</code>, <code>number.*</code>.</td>
</tr>
</table>
</details>

**Other cards**

- `custom:nuvio-map-card`: the native HA map in a glass frame (no screenshot: map tiles need internet access).
- `custom:nuvio-energy-card`: load percentage of the total phase power against your maximum (no screenshot yet: it does not render correctly outside a fixed-height grid).
- `custom:nuvio-bars-card`: daily consumption bars from statistics (no screenshot yet: same fixed-height issue).
  - `custom:nuvio-gauge-card`: a numeric sensor on an arc.
- `custom:nuvio-page`: the full-screen layout itself (top bar, rail, header, card panel); every screenshot above uses it.

## More cards and the form library (1.2.0)

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

## Layout containers (1.1.0)

Grid, vertical stack and horizontal stack work like in Home Assistant, but in Nuvio glass. They are the first group in **+ Add**, under *Layout*. The form of a container lists its cards: add any component, tile or card from HA, edit a card in its own form, drag to reorder, duplicate, remove, and in a grid set how many columns a card spans. Containers can be nested up to three levels. A card on the panel can be moved into a container from its form, and a card inside a container can be moved back out to the panel.

**Card from HA (YAML)** takes the YAML (or JSON) that the Home Assistant card editor shows under *Show code editor*. A `grid`, `vertical-stack` or `horizontal-stack` becomes the matching Nuvio container with the same cards, any other card is shown as it is. The same conversion happens for these types in the Nuvio page config; add `keep_ha: true` to keep the original Home Assistant card. An example is in [examples/containers.yaml](examples/containers.yaml).

| Card | What it does | Options |
|---|---|---|
| `custom:nuvio-grid-card` | Cards in columns; fewer columns on narrow screens | `cards`, `columns` (1 to 6, 0 = automatic), `min_width`, `square`, `gap`, `glass`, `title`; per card `span` |
| `custom:nuvio-stack-card` | Cards one below another or side by side in one glass; side by side turns vertical below `wrap_below` px | `cards`, `direction`, `gap`, `ratio` (e.g. `[2, 1]`), `wrap_below`, `divider`, `glass`, `title` |

## Generic cards and containers (0.16.0)

Twelve cards built only from the shared glass blocks, so they look like the reference design and work with any entity of the right domain. Each one adapts to its width: small (up to 220 px) hides secondary text, large (from 420 px) shows extra detail. They also work in a regular Home Assistant view, where they blur the background themselves. A ready dashboard built only from them is in [examples/inspiration-dashboard.yaml](examples/inspiration-dashboard.yaml) (works with the HA demo integration).

<img src="components/generic-dashboard.webp" alt="Sample dashboard built from the generic cards" width="100%">

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

## Rooms, appliances and Home Glass parity (0.7.0)

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
| Child (LiveKid) | `custom:nuvio-kid-card` | title, child (name) or entity when there are several children; entities of the LiveKid integration are found automatically |

**Appearance, Rooms**: rename rooms, set icons and order, hide rooms, choose the temperature and humidity sensor for each room tile (automatic, any sensor, or none), and create custom rooms with any entities, independent of Home Assistant areas. Entities can also be assigned by hand to existing rooms.

**Appearance, Header and navigation**: household title and subtitle (or no household strip), fuel prices in the dashboard header, and the four views on the phone bar.

**Appearance, Background gallery**: add your own images by `/local/` or `https://` address; they show up in Background and in the wall tablet slideshow.

**Appearance, Header and navigation** (0.8.0) also has: the weather entity for the header and an optional sensor with a `forecast` attribute for the hourly strip, the household strip position (left or next to the panel), and a per view table with the icon, a short label for the phone bar, desktop and tablet column count (built in views too), whether the view is in the sidebar and its order there. **Background gallery** has a focal point for the current background.

**Settings** (0.9.0): Appearance is now a separate settings panel with tabs: Appearance, Views, Rooms, Header and navigation, Backgrounds, Screensaver and Backup. The view settings table has proper column labels and turns into labelled cards on a phone.

**More components in + Add** (0.9.0): light with brightness, thermostat, big value, history graph, doors and windows, batteries, vacuum, mini player, clock, sun, note, image or page, and updates. Each one has a live preview, form fields and is included in export and import.

