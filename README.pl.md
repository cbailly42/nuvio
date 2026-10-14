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
  <img src="https://img.shields.io/badge/version-v0.3.18-a3e635?style=flat-square" alt="v0.3.18">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT"></a>
</p>

<p align="center"><a href="README.md">English</a> · <b>Polski</b></p>

---

Nuvio to kompletny pulpit (widoki, nawigacja, karty i edytor na miejscu) w jednej wtyczce frontendu.
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
  Widok pojawia się tylko, gdy masz pasujące encje; brakujące integracje są po prostu ukrywane.
- **Kreator pierwszego uruchomienia** (administrator): język (Polski / English), widoki, widoczne pokoje.
- **Puste pokoje**: pokój bez urządzeń proponuje **Importuj z obszaru** (podgląd encji z obszaru i pasujących po nazwie, z polami wyboru; **Wybierz encje**, aby wskazać dowolne encje ręcznie; opcjonalnie przypisanie ich też do obszaru w Home Assistant) oraz **Utwórz własny układ** (tryb edycji z pustym pokojem i galerią + Dodaj). Ustawienia obszaru zostają jako link pomocniczy.
- **Tryb edycji**: przeciąganie, ukrywanie i przywracanie, rozmiary S/M/L, dodawanie kafli z dowolnej encji, podmiana encji,
  style wyświetlania z podglądem na żywo, wygląd (kolor akcentu z automatycznym kontrastem WCAG, tło: zdjęcie / kolor / gradient, przyciemnienie).
- **Galeria komponentów (+ Dodaj)**: najpierw grupa **Podstawowe** (Suwak, Przycisk, Lista encji, Wybór, Licznik, Wskaźnik, z miniaturami na żywo, dostępne też w pokojach), potem **Karty** dla konkretnych rodzajów urządzeń. Formularz komponentu nie ma wyboru trybu wyświetlania; prawdziwe warianty (suwak poziomy lub pionowy, przycisk jako kafel lub wiersz, wybór jako przyciski lub lista) są w **Opcjach komponentu**.
  <br><img src="docs/components/gallery-basic.png" alt="Galeria komponentów z grupą Podstawowe" width="420">
- **Zapis per użytkownik**: układ i wygląd zapisywane w Home Assistant (`frontend/set_user_data`, klucz `nuvio_layout`) z kopią lokalną.
- **Interfejs po polsku i angielsku**: karty, tryb edycji i wygląd w języku wybranym w kreatorze (albo `language:` / profil HA); liczby i daty w tym samym formacie.
- **Tryb edycji z klawiatury**: strzałki na uchwycie kafla przesuwają go, strzałki góra/dół zmieniają kolejność encji na listach.
- **Tryb jasny i ciemny**, obsługa dotyku, szacunek dla „ogranicz ruch”.

## Komponenty

Każdej karty można użyć samodzielnie jako `custom:nuvio-<nazwa>-card` (np. w zwykłym pulpicie po *Przejmij kontrolę*). Zrzuty: ciemny motyw, domyślne tło, dane demo.

<details open>
<summary><b>Dom i klimat</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="docs/components/weather.png" alt="Pogoda" width="100%"><br><b>Pogoda</b> <code>custom:nuvio-weather-card</code><br>Bieżąca pogoda, prognoza godzinowa, wschód i zachód słońca; po dotknięciu szczegóły dni. <code>weather.*</code>, opcjonalny czujnik temperatury, <code>sun.sun</code>.</td>
<td width="50%" valign="top"><img src="docs/components/climate.png" alt="Klimatyzacja" width="100%"><br><b>Klimatyzacja</b> <code>custom:nuvio-ac-card</code><br>Duża temperatura docelowa z suwakiem, tryby HVAC, nawiew i lamele. <code>climate.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/light.png" alt="Oświetlenie" width="100%"><br><b>Oświetlenie</b> <code>custom:nuvio-light-card</code><br>Suwak jasności jednego światła. <code>light.*</code>.</td>
<td width="50%" valign="top"><img src="docs/components/switch.png" alt="Przełącznik" width="100%"><br><b>Przełącznik</b> <code>custom:nuvio-switch-card</code><br>Przełącznik w stylu glass jako wiersz lub kafel. <code>switch.*</code>, <code>input_boolean.*</code>, <code>fan.*</code> i inne encje wł./wył.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/scenes.png" alt="Sceny i skrypty" width="100%"><br><b>Sceny i skrypty</b> <code>custom:nuvio-scenes-card</code><br>Kilka scen lub skryptów jako przyciski z animacją potwierdzenia. <code>scene.*</code>, <code>script.*</code>.</td>
<td width="50%" valign="top"><img src="docs/components/script.png" alt="Skrypt" width="100%"><br><b>Skrypt</b> <code>custom:nuvio-script-card</code><br>Pojedynczy kafel uruchamiający skrypt. <code>script.*</code>, <code>scene.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/sensors.png" alt="Czujniki" width="100%"><br><b>Czujniki</b> <code>custom:nuvio-sensors-card</code><br>Automatycznie wykryte czujniki ruchu, obecności, drzwi, okien, zalania i inne, z filtrami. <code>binary_sensor.*</code>.</td>
<td width="50%"></td>
</tr>
</table>
</details>

<details open>
<summary><b>Energia</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="docs/components/power.png" alt="Moc teraz" width="100%"><br><b>Moc teraz</b> <code>custom:nuvio-power-card</code><br>Moc chwilowa z linią z ostatnich godzin. <code>sensor.*</code> z <code>device_class: power</code>.</td>
<td width="50%" valign="top"><img src="docs/components/phases.png" alt="Fazy" width="100%"><br><b>Fazy</b> <code>custom:nuvio-phases-card</code><br>Moc, napięcie i prąd na każdej fazie z paskami obciążenia. Czujniki mocy, napięcia i prądu dla faz.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/energy-stats.png" alt="Energia (statystyki)" width="100%"><br><b>Energia (statystyki)</b> <code>custom:nuvio-energy-stats-card</code><br>Zużycie i produkcja: dziś, tydzień, miesiąc, z wykresem. Statystyki długoterminowe albo ustawienia panelu Energia HA.</td>
<td width="50%" valign="top"><img src="docs/components/week.png" alt="Energia: tydzień" width="100%"><br><b>Energia: tydzień</b> <code>custom:nuvio-week-card</code><br>Zużycie z sieci i produkcja PV z 7 dni. Statystyki energii.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/solar.png" alt="Solar" width="100%"><br><b>Solar</b> <code>custom:nuvio-solar-card</code><br>Produkcja PV z ostatnich dni jako wykres. Jedna statystyka energii i opcjonalny czujnik „dziś”.</td>
<td width="50%" valign="top"><img src="docs/components/pv.png" alt="Fotowoltaika" width="100%"><br><b>Fotowoltaika</b> <code>custom:nuvio-pv-card</code><br>Stan falownika, moc teraz, energia dziś, stringi i temperatura. Czujniki falownika.</td>
</tr>
</table>
</details>

<details open>
<summary><b>Multimedia i kamery</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="docs/components/players.png" alt="Multimedia" width="100%"><br><b>Multimedia</b> <code>custom:nuvio-players-card</code><br>Wszystkie odtwarzacze: okładka, tytuł, postęp, sterowanie, głośność i źródło. <code>media_player.*</code> (wykrywane automatycznie).</td>
<td width="50%" valign="top"><img src="docs/components/media.png" alt="Odtwarzacz" width="100%"><br><b>Odtwarzacz</b> <code>custom:nuvio-media-card</code><br>Kompaktowa karta jednego odtwarzacza. <code>media_player.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/camera.png" alt="Kamera" width="100%"><br><b>Kamera</b> <code>custom:nuvio-camera-card</code><br>Migawka odświeżana co kilka sekund, podgląd na żywo po dotknięciu. <code>camera.*</code>.</td>
<td width="50%" valign="top"><img src="docs/components/cameras.png" alt="Kamery" width="100%"><br><b>Kamery</b> <code>custom:nuvio-cameras-card</code><br>Działające kamery jako duże kafle, niedostępne zwinięte do chipów. <code>camera.*</code>.</td>
</tr>
</table>
</details>

<details open>
<summary><b>Domownicy i kalendarz</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="docs/components/people.png" alt="Domownicy" width="100%"><br><b>Domownicy</b> <code>custom:nuvio-people-card</code><br>Wszyscy z awatarem, strefą i czasem od zmiany. <code>person.*</code>, opcjonalnie <code>zone.*</code>.</td>
<td width="50%" valign="top"><img src="docs/components/person.png" alt="Osoba" width="100%"><br><b>Osoba</b> <code>custom:nuvio-person-card</code><br>Jedna osoba z awatarem i strefą. <code>person.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/agenda.png" alt="Agenda" width="100%"><br><b>Agenda</b> <code>custom:nuvio-agenda-card</code><br>Nadchodzące wydarzenia pogrupowane po dniach, kolor na kalendarz. <code>calendar.*</code>.</td>
<td width="50%" valign="top"><img src="docs/components/month.png" alt="Miesiąc" width="100%"><br><b>Miesiąc</b> <code>custom:nuvio-month-card</code><br>Siatka miesiąca z kropkami wydarzeń i listą wybranego dnia. <code>calendar.*</code>.</td>
</tr>
</table>
</details>

<details open>
<summary><b>Bezpieczeństwo i urządzenia</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="docs/components/alarm.png" alt="Alarm" width="100%"><br><b>Alarm</b> <code>custom:nuvio-alarm-card</code><br>Stan alarmu i tryby uzbrajania wg obsługiwanych funkcji, z klawiaturą kodu. <code>alarm_control_panel.*</code>.</td>
<td width="50%" valign="top"><img src="docs/components/robots.png" alt="Roboty" width="100%"><br><b>Roboty</b> <code>custom:nuvio-robots-card</code><br>Odkurzacze i kosiarki: stan, start, baza, lokalizacja, moc ssania i ostatnie sprzątanie. <code>vacuum.*</code>, <code>lawn_mower.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/net.png" alt="Sieć" width="100%"><br><b>Sieć</b> <code>custom:nuvio-net-card</code><br>Stan internetu, opóźnienie i prędkość; inne sekcje: bramka, punkty dostępowe, Wi-Fi i klienci. Encje UniFi.</td>
<td width="50%"></td>
</tr>
</table>
</details>

<details open>
<summary><b>Pokoje i nawigacja</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="docs/components/areas.png" alt="Pokoje" width="100%"><br><b>Pokoje</b> <code>custom:nuvio-areas-card</code><br>Wszystkie obszary HA: temperatura, wilgotność, światła, ruch, klimatyzacja. Rejestr obszarów.</td>
<td width="50%" valign="top"><img src="docs/components/room.png" alt="Pokój" width="100%"><br><b>Pokój</b> <code>custom:nuvio-room-card</code><br>Wszystkie encje pokoju pogrupowane wg rodzaju (światła, klimatyzacja, rolety, przełączniki…). Adres <code>?area=<id></code>. Pusty pokój proponuje import z obszaru albo własny układ.<br><img src="docs/components/empty-room.png" alt="Pusty pokój: import z obszaru" width="100%"></td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/link.png" alt="Link" width="100%"><br><b>Link</b> <code>custom:nuvio-link-card</code><br>Kafel nawigacji lub akcji. Dowolna ścieżka lub akcja.</td>
<td width="50%"></td>
</tr>
</table>
</details>

<details open>
<summary><b>Podstawowe sterowanie</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="docs/components/slider.png" alt="Suwak" width="100%"><br><b>Suwak</b> <code>custom:nuvio-slider-card</code><br>Suwak do jasności, głośności, prędkości wentylatora, pozycji rolety lub wartości liczbowej, poziomy albo pionowy. <code>light.*</code>, <code>media_player.*</code>, <code>fan.*</code>, <code>cover.*</code>, <code>valve.*</code>, <code>input_number.*</code>, <code>number.*</code>.</td>
<td width="50%" valign="top"><img src="docs/components/button.png" alt="Przycisk" width="100%"><br><b>Przycisk</b> <code>custom:nuvio-button-card</code><br>Przycisk uruchamiający skrypt, scenę, przycisk lub dowolną akcję, jako kafel albo pigułka, z potwierdzeniem Wykonano. <code>script.*</code>, <code>scene.*</code>, <code>button.*</code>, <code>input_button.*</code>, <code>automation.*</code> lub dowolna <code>tap_action</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/entities.png" alt="Lista encji" width="100%"><br><b>Lista encji</b> <code>custom:nuvio-entities-card</code><br>Lista encji z przełącznikiem, przyciskiem Uruchom lub wartością w każdym wierszu. <code>light.*</code>, <code>switch.*</code>, <code>fan.*</code>, <code>input_boolean.*</code>, <code>script.*</code>, <code>scene.*</code>, <code>button.*</code>, <code>sensor.*</code>, <code>binary_sensor.*</code> i inne encje tylko do odczytu.</td>
<td width="50%" valign="top"><img src="docs/components/select.png" alt="Wybór" width="100%"><br><b>Wybór</b> <code>custom:nuvio-select-card</code><br>Wybór opcji jako chipy albo lista. <code>input_select.*</code>, <code>select.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/components/stepper.png" alt="Licznik" width="100%"><br><b>Licznik</b> <code>custom:nuvio-stepper-card</code><br>Licznik ze zwiększaniem, zmniejszaniem i resetem albo zmiana wartości o krok. <code>counter.*</code>, <code>input_number.*</code>, <code>number.*</code>.</td>
<td width="50%" valign="top"><img src="docs/components/gauge.png" alt="Wskaźnik" width="100%"><br><b>Wskaźnik</b> <code>custom:nuvio-gauge-card</code><br>Wskaźnik łukowy pokazujący wartość czujnika, z zakresem dobranym do jednostki. <code>sensor.*</code>, <code>input_number.*</code>, <code>number.*</code>.</td>
</tr>
</table>
</details>

**Pozostałe karty**

- `custom:nuvio-map-card`: natywna mapa HA w szklanej ramce (bez zrzutu: kafelki mapy wymagają internetu).
- `custom:nuvio-energy-card`: procent obciążenia (suma faz względem mocy maksymalnej) (bez zrzutu: poza siatką o stałej wysokości renderuje się niepoprawnie).
- `custom:nuvio-bars-card`: dzienne słupki zużycia ze statystyk (bez zrzutu: ten sam problem z wysokością).
  - `custom:nuvio-gauge-card`: wartość czujnika liczbowego na łuku.
- `custom:nuvio-page`: sam pełnoekranowy układ (pasek, szyna, nagłówek, panel kart); używają go wszystkie zrzuty powyżej.

### Planowane

Na podstawie [docs/STATUS.md](docs/STATUS.md). W kodzie nie ma innych planowanych komponentów (brak TODO i pozycji „wkrótce”).

| Pozycja | Status |
|---|---|
| Edytor widoków: dodawanie, zmiana nazw i kolejności całych widoków | gotowe (Wygląd → Widoki) |
| Pełne tłumaczenie kart i trybu edycji | gotowe (polski / angielski) |
| Eksport i import konfiguracji w interfejsie | nie rozpoczęte |
| Podpowiedzi dla pustego widoku Panel | gotowe |

## Instalacja

### HACS (własne repozytorium)

1. HACS → ⋮ → *Niestandardowe repozytoria* → `https://github.com/kczepiec/nuvio`, kategoria **Dashboard**.
2. Zainstaluj **Nuvio**. HACS doda zasób `/hacsfiles/nuvio/nuvio.js`.
3. Ustawienia → Pulpity → *Dodaj pulpit* → *Nowy pulpit od zera*, otwórz go, ⋮ → *Edytuj* → ⋮ → *Edytor konfiguracji* i wklej:

   ```yaml
   strategy:
     type: custom:nuvio
   ```

4. Otwórz pulpit. Przy pierwszej wizycie uruchomi się kreator.

### Ręcznie

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

## Konfiguracja

Opcjonalne ustawienia strategii:

```yaml
strategy:
  type: custom:nuvio
  language: pl        # pl | en (domyślnie: język Twojego HA)
```

> [!TIP]
> Aby przejąć wygenerowany pulpit jako zwykły YAML, użyj *Przejmij kontrolę* w edytorze pulpitu. Wszystkie karty `custom:nuvio-*` dalej działają.

## Presety

Konfigurację (układ + wygląd) można eksportować i importować jako JSON. Osobiste presety są przechowywane poza repozytorium.

## Rozwój

```bash
python3 tools/build.py   # -> dist/nuvio.js
python3 tools/guard.py   # błąd, jeśli do dist trafił identyfikator konkretnego domu
```

Wydania budują GitHub Actions na tagach `v*`.

## Lista zmian

### 0.3.18
- Poprawka: pogoda w nagłówku znów ma animowaną ikonę (0.3.17 omyłkowo zmieniła ją na statyczną; nie ona powodowała poświatę).
- Zawiera zmiany z 0.3.17, która nie dostała tagu: brak poświaty na widokach z panelem o połowie szerokości, a wskaźniki zakładek i szyny nie trzymają stałej warstwy GPU.

### 0.3.17
- Zmiana: wskaźniki zakładek i szyny nie trzymają stałej warstwy GPU (dostają ją tylko na czas animacji).

### 0.3.16
- Poprawka: Gotowe, Zapisz i inne główne przyciski zatwierdzają i zamykają bez pytania. Pytanie o odrzucenie zmian pojawia się tylko przy zamykaniu formularza z niezapisanymi zmianami (ustawienia karty, formularz komponentu) przez X, Escape, tło lub przeciągnięcie; arkusze stosujące zmiany na żywo (Wygląd, tytuł, Przywróć ukryte, galeria) nigdy nie pytają.
- Poprawka: anulowanie trybu edycji znów poprawnie przywraca układ (sprawdzanie niezapisanych zmian z 0.3.13 nadpisywało migawkę trybu edycji).
- Poprawka: przycisk Odrzuć używa koloru błędu z Home Assistant zamiast stałej czerwieni, a kafelek Dodaj w trybie edycji ma rozmiar małego kafelka.

### 0.3.15
- Poprawka: przycisk ukrywania panelu zmienia ikonę (oko) i etykietę oraz podaje stan przez aria-pressed.
- Poprawka: długie nazwy encji na kafelkach nie są już ucięte u góry i u dołu; zawijają się do 2 linii z wielokropkiem, a nieznane wartości pokazują Brak danych zamiast kreski.
- Ulepszenie: wybór rozmiaru to szklany przełącznik segmentowy z symbolami rozmiaru, równymi szerokościami i etykietami Mały, Średni i Cała szerokość, wybrany w kolorze akcentu.
- Poprawka: w trybie edycji kafelek Dodaj jest kolejną komórką siatki, wielkości małego kafelka, bez pustych rzędów; uchwyty przeciągania, usuwania i rozmiaru leżą równo na krawędziach kafelka.
- Poprawka: wszystkie przyciski w stopce okien mają tę samą wysokość i odstępy, są wyrównane do prawej, a na telefonie układają się jeden pod drugim na całą szerokość.
- Nowość: pole Ikona ma wybór ikon z wyszukiwaniem pełnej listy MDI z Home Assistant, ostatnimi ikonami, obsługą klawiatury i podglądem; ręczne wpisanie mdi:nazwa nadal działa.

### 0.3.14
- Poprawka: widok lub panel bez widocznych elementów pokazuje pusty stan „Pusty widok” z przyciskiem Dodaj widżet, na żywo po usunięciu, ukryciu, cofnięciu lub ponowieniu, w trybie edycji i zwykłym, we wszystkich rodzajach widoków. Cofnięcie przywraca elementy i ukrywa pusty stan.
- Poprawka: przycisk Cofnij w powiadomieniach używa koloru tekstu dopasowanego do akcentu motywu.

### 0.3.13
- Poprawka: formularz komponentu otwarty z ustawień karty wraca tam, skąd go otwarto (Wstecz go zamyka), a nie do galerii. Wszystkie arkusze edycji używają jednego stosu nawigacji.
- Ulepszenie: wpisany tekst, wyszukiwanie i wybory zostają przy przechodzeniu w przód i wstecz, pozycja przewinięcia jest pamiętana dla każdego kroku, fokus trafia na tytuł kroku i wraca do przycisku, który go otworzył. Escape cofa o krok. Zamknięcie z niezapisanymi zmianami pyta o potwierdzenie (Odrzuć albo Zostań), tylko gdy coś się zmieniło. Na telefonie przeciągnięcie w dół zamyka tylko najwyższy poziom, a przeciągnięcie od lewej krawędzi cofa o krok. Animacje respektują ograniczenie ruchu.
- Nowość: menu użytkownika pokazuje wersję Nuvio i informację o aktualizacji (z encji aktualizacji HACS albo z wydań GitHub, najwyżej raz na 6 godzin) z kropką przy awatarze oraz podpowiedź odświeżenia, gdy na serwerze jest już nowszy plik.

### 0.3.12
- Poprawka: nawigacja w arkuszach edycji działa jak stos. W zagnieżdżonym kroku (wybór encji, formularz komponentu, styl widżetu, zmiana encji z ustawień karty) X, Escape i nowa strzałka wstecz wracają do poprzedniego kroku z zachowanym stanem; arkusz zamyka tylko X na najwyższym poziomie (galeria + Dodaj albo ustawienia). Kroki wsuwają się płynnie, bez zamykania i ponownego otwierania arkusza.

### 0.3.11
- Zmiana: zaprojektowane podglądy w galerii + Dodaj. Każdy komponent pokazuje małą makietę z przykładowymi danymi, oznaczoną jako podgląd (suwak z wypełnieniem, przycisk, wiersze encji z przełącznikami, wybór, licznik, łuk wskaźnika, światło, odczyt czujnika, wykres, klimatyzacja, roleta, sceny, odtwarzacz, kamery, moc, energia, pogoda, domownicy, alarm, roboty, kalendarz, mapa) w tym samym stylu szkła i akcentu. Podgląd na żywo z prawdziwą encją pojawia się tylko wtedy, gdy wszystkie potrzebne encje mają znany stan.
- Zmiana: komponenty bez pasującej encji można nadal wybrać, są tylko lekko przygaszone i mają jedną krótką linię (Brak pasującej encji), a wymagane domeny mniejszym tekstem i w podpowiedzi. Karty mają równą wysokość, podglądy jedną wysokość, a długie teksty są przycinane na telefonie, tablecie i komputerze.

### 0.3.10
- Nowe: szerokość panelu dla każdego widoku. Każdy widok (wbudowany i własny) ma do wyboru **Panel wąski** (kolumna po prawej jak w głównym Panelu, lewa strona wolna na tytuł i tło) albo **Panel na całą szerokość** (jak w Pokojach), z małymi podglądami. Wybór jest w arkuszu tytułu widoku (tryb edycji, tytuł) i w formularzu własnego widoku, działa od razu bez ponownego otwierania okna i zapisuje się dla każdego widoku. Wąski panel mieści najwyżej dwie kolumny; na telefonie panel zawsze zajmuje całą szerokość.
- Zmiana: podpowiedź pustego widoku zostaje, dopóki własny widok nie ma trzech elementów, i wyświetla się pod kafelkami, więc widok z jednym wierszem nie wygląda już na pusty.

### 0.3.9
- Poprawka: układy własnych widoków naprawdę się różnią. **Siatka** to równe rzędy z kartami rozciągniętymi do wysokości rzędu, **Kolumny** układają karty od góry w każdej kolumnie po kolei bez wyrównania rzędów, **Masonry** wstawia każdą kartę do najkrótszej kolumny, a **Panel** pokazuje pogodę u góry i dwie kolumny. Zapisywane dla każdego widoku i stosowane po odświeżeniu.
- Poprawka: okno ustawień widoku aktualizuje się na miejscu. Wybór układu, ikony czy innej opcji nie zamyka już i nie otwiera okna od nowa; zostają pozycja przewinięcia, wpisany tekst i fokus.

### 0.3.8
- Nowe: jeden szklany select w całym Nuvio. Każda lista wyboru (kolumny widoku na urządzeniach, maks. szerokość, źródło odtwarzacza) ma teraz szklany przycisk pasujący do pól i animowaną szklaną listę z rozmyciem widocznym od pierwszej klatki, znacznik w kolorze akcentu przy wybranej opcji, pełną obsługę klawiatury (strzałki, Home, End, Enter, Esc, wyszukiwanie przez pisanie), semantykę ARIA listbox, zamykanie po kliknięciu obok, otwieranie w górę przy dolnej krawędzi i większe pola dotyku na telefonach. Lista wyświetla się nad arkuszami i innym szkłem, więc nigdy nie jest ucięta. Natywny select zostaje pod spodem jako źródło wartości.

### 0.3.7
- Nowe: zapasowe źródło zdjęć i czcionek. Nuvio wczytuje tła, miniatury w galerii i czcionki najpierw z lokalnej instalacji, a gdy plik się nie wczyta, z jsDelivr przypiętego do działającej wersji (`cdn.jsdelivr.net/gh/kczepiec/nuvio@v<wersja>/dist/`). Bez internetu nadal działają pliki lokalne.
- Poprawka: szwy na szkle przy tle ze zdjęciem. Przyciemnienie tła to teraz jedna nakładka zamiast filtra CSS na pełnoekranowym zdjęciu, a warstwy tła są znów zwykłymi warstwami fixed, więc rozmyte elementy próbkują jednolite tło.
- Poprawka: okienko "Więcej" na pasku bocznym jest matowe od pierwszej klatki (animacja odsłaniania zamiast przejścia opacity, które wyłączało rozmycie), a kafelki mają równą wysokość i wyrównanie.
- Poprawka: widoki o tej samej nazwie lub podobnych ścieżkach. Aktywny element paska dopasowuje całe segmenty ścieżki (`/nuvio/test` nie zapala się dla `/nuvio/test2`), a `rail_overflow` przyjmuje ścieżkę widoku i nigdy nie przypisuje dwóch wpisów do jednego elementu.

### 0.3.6
- Nowość: szerokość sekcji. Ustawienia sekcji pulpitu mają **Automatyczna**, **Pełna szerokość** lub **Połowa** z małym podglądem; na telefonie każda sekcja ma pełną szerokość. Zapisywane osobno dla każdej sekcji.
- Nowość: w trybie edycji Nuvio sprawdza na serwerze, czy jest nowszy `nuvio.js`, i prosi o odświeżenie bez pamięci podręcznej (Ctrl+Shift+R), gdy przeglądarka uruchamia starą wersję. Nagłówek galerii + Dodaj pokazuje załadowaną wersję.
- Zmienione: karty podpowiedzi pustego stanu mają promień 16 px i mniejszą ikonę.
- Naprawione: miniatury teł, które się nie wczytały, pokazują „Nie wczytano zdjęcia” zamiast samego gradientu i zapisują adres w konsoli.
- Naprawione: wybrana miniatura tła miała podwójną ramkę fokusu; fokus z klawiatury to teraz jeden zaokrąglony pierścień w kolorze akcentu, bez ramki po kliknięciu myszą.
- Naprawione: tło i przyciemnienie są pojedynczymi pełnoekranowymi warstwami GPU, więc szklane elementy próbkują jedno tło (dotyczy pionowego szwu widocznego w Chrome na macOS).

### 0.3.5
- Naprawione: tło wybrane w starszej wersji (zapisane ze starą ścieżką `assets/backgrounds/` lub `assets/bg/`) jest przenoszone na nowy płaski plik `nuvio-bg-*`, więc po aktualizacji znów się wyświetla.

### 0.3.4
- Naprawione: po instalacji z HACS brakowało czcionek, teł i ikon pogody. HACS pobiera tylko pliki leżące bezpośrednio w `dist/`, więc wszystkie zasoby są tam teraz z unikalnymi nazwami (`nuvio-font-*`, `nuvio-bg-*`, `nuvio-meteo-*`); autorzy teł w `dist/CREDITS.md`.
- Naprawione: baza zasobów brana jest z adresu modułu, więc instalacja ręczna w `/local/nuvio/` ładuje własne czcionki i tła zamiast z `/hacsfiles/nuvio/`.

### 0.3.3
- Naprawione: w trybie edycji uchwyt i X pierwszego bloku w kolumnie pokoju były rysowane na bloku z poprzedniej kolumny; każdy blok ma teraz dokładnie jeden uchwyt (lewy górny róg), jeden X (prawy górny) i S/M/L w środku.
- Zmienione: wydania nie mają już załączników `nuvio.zip` ani `nuvio.js`. HACS instaluje wtedy cały folder `dist/` razem z `assets/` (czcionki, tła); przy załącznikach pomijał `dist/` i zostawiał starą wersję. Instalacja ręczna: `dist/` z archiwum źródeł wydania.

### 0.3.2
- Nagłówek galerii + Dodaj pokazuje wersję załadowanej paczki Nuvio, więc stara lub zbuforowana paczka (bez grupy Podstawowe) jest od razu widoczna. Po aktualizacji w HACS odśwież przeglądarkę (Ctrl+Shift+R) albo wyczyść pamięć aplikacji.

### 0.3.1
- Poprawka: uniwersalne komponenty (Suwak, Przycisk, Lista encji, Wybór, Licznik, Wskaźnik) nie pojawiały się w galerii + Dodaj w pokojach (galeria pokoju pokazywała tylko kafelki); teraz są w grupie **Podstawowe** z miniaturami na żywo, a pokoje wyświetlają dodane komponenty.
- Zmiana: formularz komponentu nie pokazuje już wyboru trybu wyświetlania; prawdziwe warianty są opisane jako **Opcje komponentu**.
- Poprawka: niezaznaczone pola wyboru w oknie importu pokoju były niewidoczne na ciemnym tle.

### 0.3.0
- Nowość: widok pustego pokoju z dwiema akcjami. **Importuj z obszaru** pokazuje encje z obszaru (oraz encje z nazwą pasującą do pokoju) z polami wyboru, wyszukiwarkę **Wybierz encje** do ręcznego wyboru i opcję przypisania ich też do obszaru w Home Assistant; zaznaczone encje stają się kafelkami ułożonymi według rodzaju (klimatyzacja i kamery duże, multimedia średnie). **Utwórz własny układ** otwiera tryb edycji z pustym pokojem i galerią + Dodaj.

### 0.2.1
- Naprawione: HACS rejestrował jako zasób `nuvio.zip` zamiast `nuvio.js`, przez co strategia dashboardu się nie ładowała („Timeout waiting for strategy element”).

### 0.2.0
- Poprawka: przyciski scen wywołują `scene.turn_on` (wcześniej nic nie robiły).
- Poprawka: czujniki mocy w kW / MW są przeliczane na waty w kartach mocy, energii, faz i fotowoltaiki.
- Poprawka: kamery w widoku pokoju nie psują się po ok. 10 minutach (rotujący token obrazu).
- Poprawka: zapis układu scala się z najnowszą wersją z serwera (bez nadpisywania między urządzeniami); kopia lokalna jest osobna dla każdego użytkownika HA.
- Poprawka: strzałki klimatyzacji nie powtarzają się po puszczeniu poza kartą; termostaty z zakresem `heat_cool` są tylko do odczytu; domyślny krok 0,5 °C.
- Poprawka: telewizor w trybie czuwania się włącza; przyciski odtwarzania, rolet i zaworów uwzględniają możliwości urządzenia.
- Poprawka: kalendarz miesięczny się odświeża; pole kodu alarmu nie traci fokusu; pogoda używa jednostki opadów i tekstowego kierunku wiatru.
- Poprawka: strona nie wywraca się przy pustym `rail`; wyjście z trybu edycji przez nawigację zapisuje zmiany zamiast je odrzucać.
- Nowe: angielski interfejs wszystkich kart, strony i trybu edycji.
- Nowe: zmiana kolejności z klawiatury w trybie edycji; „Cofnij” po usunięciu kafla przywraca tylko ten kafel.
- HACS: fonty, tła i ikony pogody instalują się razem z wtyczką (cały folder `dist/`).
- Wieloetapowy kreator; własne widoki (Wygląd → Widoki); komponenty i widoki Mapa i Kalendarz.
- Komponenty ogólne: suwak, przycisk, lista encji, wybór, licznik, wskaźnik.
- Podpowiedzi dla pustych stanów, tryby wyświetlania kart grupowych, edytowalny tytuł i podtytuł widoku, stos powiadomień.

### 0.1.1
- Galeria „+ Dodaj” z podglądem na żywo; poprawka szuflady w trybie kiosku; katalog komponentów w README.

## Licencja i podziękowania

Nuvio jest udostępniany na [licencji MIT](LICENSE).

Dołączone zasoby zewnętrzne:
- [DM Sans](dist/nuvio-font-OFL.txt): SIL Open Font License 1.1
- [Meteocons](dist/nuvio-meteo-LICENSE.txt): Bas Milius, MIT
- [Domyślne zdjęcie tła](dist/CREDITS.md): „House in forest”, autor Flo Pappert, CC0 1.0 (przez Wikimedia Commons)
