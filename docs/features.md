# Features guide

How the shared dashboard, wall tablet mode and layout backup work. Back to the [README](../README.md).

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
