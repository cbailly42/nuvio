<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.png">
    <img src="docs/assets/logo-light.png" alt="Nuvio" width="300">
  </picture>
</p>

<p align="center"><strong>Szklany pulpit Home Assistant, który sam buduje się z Twojego domu.</strong></p>

<p align="center">
  <a href="https://hacs.xyz"><img src="https://img.shields.io/badge/HACS-Custom-41BDF5?style=flat-square" alt="HACS Custom"></a>
  <img src="https://img.shields.io/badge/Home%20Assistant-2024.8.0%2B-18BCF2?style=flat-square&logo=homeassistant&logoColor=white" alt="Home Assistant 2024.8.0+">
  <img src="https://img.shields.io/badge/version-v0.1.1-a3e635?style=flat-square" alt="v0.1.1">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT"></a>
</p>

<p align="center"><a href="README.md">English</a> · <b>Polski</b></p>

---

Nuvio to kompletny pulpit — widoki, nawigacja, karty i edytor na miejscu — w jednej wtyczce frontendu.
Nie zawiera **żadnych encji na sztywno**: przy pierwszym uruchomieniu odczytuje obszary, urządzenia i encje
z Home Assistant i generuje widoki. Potem wszystko zmienisz w trybie edycji.

## Zrzuty ekranu

<p align="center">
  <img src="docs/screenshots/demo_dashboard_dark_1440.png" alt="Panel (ciemny)" width="49%">
  <img src="docs/screenshots/demo_rooms_light_1440.png" alt="Pokoje (jasny)" width="49%">
</p>
<p align="center">
  <img src="docs/screenshots/demo_kamery_dark_1440.png" alt="Kamery (ciemny)" width="49%">
  <img src="docs/screenshots/demo_pokoj_salon_dark_1440.png" alt="Widok pokoju (ciemny)" width="49%">
</p>
<p align="center">
  <img src="docs/screenshots/demo_family_light_1440.png" alt="Rodzina (jasny)" width="49%">
</p>
<p align="center">
  <img src="docs/screenshots/demo_multimedia_light_390.png" alt="Multimedia na telefonie (jasny)" width="24%">
  <img src="docs/screenshots/demo_wizard_dark_390.png" alt="Kreator pierwszego uruchomienia na telefonie (ciemny)" width="24%">
</p>

## Funkcje

- **Pulpit generowany automatycznie** (strategia `custom:nuvio`): Panel, Pokoje (+ szczegóły pokoju), Multimedia, Kamery, Rodzina, Energia.
  Widok pojawia się tylko, gdy masz pasujące encje — brakujące integracje są po prostu ukrywane.
- **Kreator pierwszego uruchomienia** (administrator): język (Polski / English), widoki, widoczne pokoje.
- **Tryb edycji**: przeciąganie, ukrywanie i przywracanie, rozmiary S/M/L, dodawanie kafli z dowolnej encji, podmiana encji,
  style wyświetlania z podglądem na żywo, wygląd (kolor akcentu z automatycznym kontrastem WCAG, tło: zdjęcie / kolor / gradient, przyciemnienie).
- **Zapis per użytkownik**: układ i wygląd zapisywane w Home Assistant (`frontend/set_user_data`, klucz `nuvio_layout`) z kopią lokalną.
- **Tryb jasny i ciemny**, obsługa dotyku, szacunek dla „ogranicz ruch”.

## Instalacja

### HACS (własne repozytorium)

1. HACS → ⋮ → *Niestandardowe repozytoria* → `https://github.com/kczepiec/nuvio`, kategoria **Dashboard**.
2. Zainstaluj **Nuvio**. HACS doda zasób `/hacsfiles/nuvio/nuvio.js`.
3. Ustawienia → Pulpity → *Dodaj pulpit* → *Nowy pulpit od zera*, otwórz go, ⋮ → *Edytuj* → ⋮ → *Edytor konfiguracji* i wklej:

   ```yaml
   strategy:
     type: custom:nuvio
   ```

4. Otwórz pulpit — przy pierwszej wizycie uruchomi się kreator.

### Ręcznie

1. Skopiuj zawartość `dist/` do `/config/www/nuvio/`.
2. Dodaj zasób `/local/nuvio/nuvio.js` (typ: **moduł JavaScript**).
3. Użyj tej samej konfiguracji `strategy` co wyżej.

## Polecane dodatki

Nuvio działa samodzielnie, ale pełnoekranowy wygląd ze zrzutów uzyskasz z tymi pakietami z HACS:

| Pakiet | Po co |
|---|---|
| [kiosk-mode](https://github.com/NemesisRE/kiosk-mode) | Ukrywa nagłówek i/lub pasek boczny Home Assistanta, więc widać tylko pulpit Nuvio (tablety ścienne, telefony). Nawigacja Nuvio współpracuje z kiosk-mode. |
| [custom-sidebar](https://github.com/elchininet/custom-sidebar) | Ukrywa lub porządkuje pozycje paska bocznego HA per użytkownik lub urządzenie, jeśli wolisz go zostawić, ale odchudzić. |
| [browser_mod](https://github.com/thomasloven/hass-browser_mod) *(opcjonalnie)* | Zamienia przeglądarkę w sterowalne urządzenie (popupy, sterowanie per urządzenie). Nuvio obsługuje jego warstwę interakcji i pomija jego odtwarzacze oraz czujniki. |

## Konfiguracja

Opcjonalne ustawienia strategii:

```yaml
strategy:
  type: custom:nuvio
  language: pl        # pl | en (domyślnie: język Twojego HA)
```

> [!TIP]
> Aby przejąć wygenerowany pulpit jako zwykły YAML, użyj *Przejmij kontrolę* w edytorze pulpitu — wszystkie karty `custom:nuvio-*` dalej działają.

## Presety

Konfigurację (układ + wygląd) można eksportować i importować jako JSON. Osobiste presety są przechowywane poza repozytorium.

## Rozwój

```bash
python3 tools/build.py   # -> dist/nuvio.js
python3 tools/guard.py   # błąd, jeśli do dist trafił identyfikator konkretnego domu
```

Wydania budują GitHub Actions na tagach `v*`.

## Licencja i podziękowania

Nuvio jest udostępniany na [licencji MIT](LICENSE).

Dołączone zasoby zewnętrzne:
- [DM Sans](dist/assets/fonts/OFL.txt) — SIL Open Font License 1.1
- [Meteocons](dist/assets/meteocons/LICENSE) — Bas Milius, MIT
- [Domyślne zdjęcie tła](dist/assets/bg/CREDITS.md): „House in forest”, autor Flo Pappert, CC0 1.0 (przez Wikimedia Commons)
