**English** · [Polski](pl/configuration.md) · [Français](fr/configuration.md)

# Configuration

Optional settings for Nuvio. Back to the [README](../README.md).

Optional strategy options:

```yaml
strategy:
  type: custom:nuvio
  language: en        # any available language code (en, pl, fr …): dashboard default (a personal choice in Settings still wins)
```

## Language

Nuvio is available in several languages: English, Polish and French today, and any language added as a catalog (see below). Each person picks their language in **Settings → Appearance → Language** (*Automatic*, then one button per available language) or with the language item in the user menu, which everyone can use, including people without access to settings. The whole dashboard switches at once without reloading the page: navigation, cards, settings, edit mode, toasts, numbers and dates. The choice is stored on this device and in your Home Assistant account, so it follows you to other devices.

Which language is used, first match wins:

1. Your own choice in Settings or the user menu.
2. The `language:` strategy option (dashboard default set in YAML). It accepts any language code that Nuvio has (`en`, `pl`, `fr` …); a regional code such as `fr-CA` falls back to `fr`.
3. The language picked in the first-run wizard.
4. Your browser languages, in order of preference: the full code first (`pt-br`), then the language alone (`pt`). If none of them is available, English.

Texts that are not translated in the chosen language are shown in English.

### Adding a language

A language is one JSON file. No code change is needed.

1. Create `src/locales/<code>.json`, where `<code>` is the lowercase language code (`de`, `pt-br` …). The easiest start is a copy of `src/locales/en.json`, the reference catalog.
2. Fill in its `_meta` block:

   ```json
   "_meta": {
     "name": "Deutsch",
     "locale": "de-DE",
     "flag": "🇩🇪",
     "intro": "Oberfläche auf Deutsch"
   }
   ```

   `name` (the language name in that language, shown in the language pickers) and `locale` (used for dates, numbers and plural rules) are required. `flag` and `intro` are optional: the first-run wizard shows them on the language step (a globe and the name otherwise).
3. Translate the values. Keep the keys, the `{variables}` and the plural suffixes as they are, and give every plural form your language needs (see [Development](development.md#translations)). A key you leave out is shown in English.
4. Check the catalog: `python3 tools/i18n_check.py --lang <code>` lists the missing and obsolete keys, and `python3 tools/i18n_check.py` checks variables, plural forms and `_meta`.
5. Build with `python3 tools/build.py`. The catalog is compiled to `dist/nuvio-locale-<code>.<hash>.json` and the language is added to the manifest embedded in the bundle: it appears in Settings, in the user menu and in the wizard, and `language: <code>` and browser detection accept it.

English, Polish and French must stay complete (`REQUIRED` in `tools/i18n_check.py`); another language may be partial, and the check then only warns with its coverage.

> [!TIP]
> To take over a generated dashboard as plain YAML, use *Take control* in the dashboard editor. All `custom:nuvio-*` cards keep working.

## Presets

Configuration (layout + appearance) can be exported/imported as JSON. Personal presets live outside the repository.
