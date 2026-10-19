# Instalacja

Nuvio wymaga Home Assistant 2024.8.0 lub nowszego. Wróć do [README](../../README.pl.md).

## HACS (własne repozytorium)

1. HACS → ⋮ → *Niestandardowe repozytoria* → `https://github.com/kczepiec/nuvio`, kategoria **Dashboard**.
2. Zainstaluj **Nuvio**. HACS doda zasób `/hacsfiles/nuvio/nuvio.js`.
3. Ustawienia → Pulpity → *Dodaj pulpit* → *Nowy pulpit od zera*, otwórz go, ⋮ → *Edytuj* → ⋮ → *Edytor konfiguracji* i wklej:

   ```yaml
   strategy:
     type: custom:nuvio
   ```

4. Otwórz pulpit. Przy pierwszej wizycie uruchomi się kreator.

## Ręcznie

1. Pobierz archiwum źródeł najnowszego wydania (GitHub, Releases, Source code) i skopiuj zawartość jego folderu `dist/` (`nuvio.js` oraz pliki `nuvio-font-*`, `nuvio-bg-*`, `nuvio-meteo-*`, wszystkie bez podfolderów) do `/config/www/nuvio/`. Wydania nie mają załączonych plików.
2. Dodaj zasób `/local/nuvio/nuvio.js` (typ: **moduł JavaScript**).
3. Użyj tej samej konfiguracji `strategy` co wyżej.

## Polecane dodatki

Nuvio działa samodzielnie, ale pełnoekranowy wygląd ze zrzutów uzyskasz z tymi pakietami z HACS:

| Pakiet | Po co |
|---|---|
| [kiosk-mode](https://github.com/NemesisRE/kiosk-mode) | Ukrywa nagłówek i/lub pasek boczny Home Assistanta, więc widać tylko pulpit Nuvio (tablety ścienne, telefony). Nawigacja Nuvio współpracuje z kiosk-mode. |
| [custom-sidebar](https://github.com/elchininet/custom-sidebar) | Ukrywa lub porządkuje pozycje paska bocznego HA per użytkownik lub urządzenie, jeśli wolisz go zostawić, ale odchudzić. |
| [browser_mod](https://github.com/thomasloven/hass-browser_mod) *(opcjonalnie)* | Zamienia przeglądarkę w sterowalne urządzenie (popupy, sterowanie per urządzenie). Nuvio obsługuje jego warstwę interakcji i pomija jego odtwarzacze oraz czujniki. |
