<p align="center"><b>English</b> · <a href="CHANGELOG.pl.md">Polski</a> · <a href="CHANGELOG.fr.md">Français</a></p>

# Changelog

All notable changes to Nuvio are listed here, newest first. Versions follow [semantic versioning](https://semver.org). The Polish changelog is in [CHANGELOG.pl.md](CHANGELOG.pl.md).

### 2.22.5
- Added: commands from Home Assistant for a wall tablet ([#47](https://github.com/kczepiec/nuvio/issues/47)): `nuvio_command` events and an `input_text` helper wake the screen, show the screensaver, lock it or open a view.
- Improved: the volume bar of the media cards now reads **− · slider · + · 🔊 30 %**, instead of mute on the left and a louder button on the right. Tap the **🔊 30 %** pill to mute (it then shows only a highlighted muted speaker), and hold − or + to keep changing the volume, with the mouse or a finger. The level shown follows each step at once, even when the speaker reports its volume late or in jumps, and the commands sent to it are spaced out.
- Added: while Kiosk Mode is on, the screen stays awake on the Nuvio dashboard, the same way it stays on while a video plays. This covers a hidden header, a hidden sidebar, kiosk for people who are not admins, and the address parameters `kiosk`, `hide_header` and `hide_sidebar`. Turn kiosk mode off and the screen can sleep again. If the screen turns off or you leave the app, Nuvio asks to keep it on again when you come back.

### 2.22.4
- Added: the header weather and a Weather card have a text size, Small, Medium or Large. The header hero also follows the dashboard zoom, so on a landscape tablet the hourly forecast can grow past the old cap.
- Fixed: the rain amount on the header weather, such as 17 mm, is white on the photo, so it stays readable.
- Added: a view can count several things at once (lights, switches, fans, media, climate, people, motion, and selected entities). The tab shows the sum. The current view also shows an icon and a count under the title, and hides a chip at 0. Lights on skips a light group when its lamps exist. Selected entities uses the searchable entity picker.

### 2.22.3
- Fixed: the Glass Minimal screensaver still showed the avatar circle in the top-right corner when **Top bar → Avatar** was off, in the live screensaver and in the preview ([#52](https://github.com/kczepiec/nuvio/issues/52)).
- Fixed: the **Discord** row in the user menu shows the Discord mark next to the label, the same way Profile and Settings show an icon. Home Assistant no longer includes that brand icon, so the menu draws it itself.
- Fixed: **Settings → Users** shows a person's photo when that Home Assistant user is linked to a person who has one. Rows without a photo keep the letter.

### 2.22.2
- Fixed: a **Cover / gate** tile (open, stop, close) on a phone was cut off on the right when it sat on the panel by itself. On a narrow tile the buttons were stretched to a full row, but that row never wrapped, so they drew past the card. They now move under the name and stay inside the tile. The media tile uses the same layout. On a wider screen the buttons stay on the right ([#53](https://github.com/kczepiec/nuvio/issues/53)).
- Added: Discord in the user menu, after Profile and Settings, and on the About Nuvio page. The English, Polish and French READMEs have a Community section and a Discord badge.

### 2.22.1
- Fixed: on phones and narrow tablets the **Views and navigation** settings were cut off on the left and squeezed into half the width, and the page could scroll sideways. A wide picker (phone tab bar) and the two-column views cards were wider than the screen, and the page was placed in the wrong grid row after the sidebar was hidden. Settings now use one full-width column, the views table is stacked cards with every field visible, nothing scrolls sideways, and the **Restore defaults** / **Done** bar sits above the bottom navigation and the home indicator. New `tools/mobile_check.py` checks every settings page on iPhone (WebKit), Android (360 px) and a 768 px tablet before each release.

### 2.22.0
- Changed: settings changes in edit mode are a draft. Views, kiosk mode, header, rooms, screensaver, PIN and Assist settings no longer save or reload the dashboard on every change; cheap previews (accent, header text) show at once. **Done** saves everything once and reloads at most once, **Cancel** discards the draft, and leaving the page with unsaved changes asks first.
- Changed: **Settings** have a new layout. A sidebar groups 13 pages (General, Appearance, Dashboard, Wall tablet, System) with a search box that finds settings on every page, keyboard navigation and a drill-down list on phones. PIN settings have their own **PIN and locks** page, there is a new **About Nuvio** page, and per-climate activity detection is folded under an advanced block. Every option and stored setting is unchanged.

### 2.21.6
- Fixed: a stray `};` in the screensaver styles dropped the rule for the next event in the list ([#34](https://github.com/kczepiec/nuvio/issues/34)); a test now scans every CSS line.
- Fixed: **Lock screen** and the start of the screensaver clear an unlocked view, so after waking the view asks for the PIN again ([#35](https://github.com/kczepiec/nuvio/issues/35)).
- Fixed: a cover tile without a position shows the Home Assistant state in words instead of a 0 % / 100 % bar ([#36](https://github.com/kczepiec/nuvio/issues/36)).
- Fixed: the screensaver asks for the screen wake lock again when the page becomes visible ([#38](https://github.com/kczepiec/nuvio/issues/38)).
