# Configuration

Optional settings for Nuvio. Back to the [README](../README.md).

Optional strategy options:

```yaml
strategy:
  type: custom:nuvio
  language: en        # pl | en: dashboard default (a personal choice in Settings still wins)
```

## Language

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
