# Nuvio

**Szklany pulpit Home Assistant, który sam buduje się z Twojego domu.**
[English → README.md](README.md)

Nuvio to kompletny pulpit (widoki, nawigacja, karty i edytor na miejscu) w jednej wtyczce frontendu.
Nie zawiera **żadnych encji na sztywno**: przy pierwszym uruchomieniu odczytuje obszary, urządzenia i encje
z Home Assistant i generuje widoki, a potem wszystko zmienisz w trybie edycji.

## Funkcje
- Pulpit generowany automatycznie (strategia `custom:nuvio`): Panel, Pokoje (+ szczegóły pokoju), Multimedia, Kamery, Rodzina, Energia –
  widok pojawia się tylko, gdy masz pasujące encje (brakujące integracje są po prostu ukrywane).
- Kreator pierwszego uruchomienia (administrator): język (Polski / English), widoki, widoczne pokoje.
- Tryb edycji: przeciąganie, ukrywanie i przywracanie, rozmiary S/M/L, dodawanie kafli z dowolnej encji, podmiana encji,
  style wyświetlania z podglądem na żywo, wygląd (kolor akcentu z automatycznym kontrastem WCAG, tło: zdjęcie / kolor / gradient, przyciemnienie).
- Układ i wygląd zapisywane per użytkownik w Home Assistant (`frontend/set_user_data`, klucz `nuvio_layout`) z kopią lokalną.
- Tryb jasny i ciemny, obsługa dotyku, szacunek dla „ogranicz ruch”.

## Instalacja
### HACS (własne repozytorium)
1. HACS → ⋮ → *Niestandardowe repozytoria* → `https://github.com/kczepiec/nuvio`, kategoria **Dashboard**.
2. Zainstaluj **Nuvio**. HACS doda zasób `/hacsfiles/nuvio/nuvio.js`.
3. Ustawienia → Pulpity → *Dodaj pulpit* → *Nowy pulpit od zera*, otwórz go, ⋮ → *Edytuj* → ⋮ → *Edytor konfiguracji* i wklej:
   ```yaml
   strategy:
     type: custom:nuvio
   ```
4. Otwórz pulpit – przy pierwszej wizycie uruchomi się kreator.

### Ręcznie
Skopiuj zawartość `dist/` do `/config/www/nuvio/`, dodaj zasób `/local/nuvio/nuvio.js` (typ: moduł JavaScript)
i użyj tej samej konfiguracji `strategy`.

## Licencja
MIT. W pakiecie: DM Sans (SIL OFL 1.1), Meteocons – Bas Milius (MIT).
