# Komponenty

Nuvio dostarcza karty jako elementy niestandardowe. Ta strona wymienia każdą kartę, jej encje i opcje. Wróć do [README](../../README.pl.md).

Każdej karty można użyć samodzielnie jako `custom:nuvio-<nazwa>-card` (np. w zwykłym pulpicie po *Przejmij kontrolę*). Zrzuty: ciemny motyw, domyślne tło, dane demo.

<details open>
<summary><b>Dom i klimat</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="../components/weather.png" alt="Pogoda" width="100%"><br><b>Pogoda</b> <code>custom:nuvio-weather-card</code><br>Bieżąca pogoda, prognoza godzinowa, wschód i zachód słońca; po dotknięciu szczegóły dni. <code>weather.*</code>, opcjonalny czujnik temperatury, <code>sun.sun</code>.</td>
<td width="50%" valign="top"><img src="../components/climate.png" alt="Klimatyzacja" width="100%"><br><b>Klimatyzacja</b> <code>custom:nuvio-ac-card</code><br>Duża temperatura docelowa z suwakiem, tryby HVAC, nawiew i lamele. Przesuń suwak w bok, przytrzymaj temperaturę po szczegóły. <code>climate.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="../components/light.png" alt="Oświetlenie" width="100%"><br><b>Oświetlenie</b> <code>custom:nuvio-light-card</code><br>Suwak jasności jednego światła. <code>light.*</code>.</td>
<td width="50%" valign="top"><img src="../components/switch.png" alt="Przełącznik" width="100%"><br><b>Przełącznik</b> <code>custom:nuvio-switch-card</code><br>Przełącznik w stylu glass jako wiersz lub kafel. <code>switch.*</code>, <code>input_boolean.*</code>, <code>fan.*</code> i inne encje wł./wył.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="../components/scenes.png" alt="Sceny i skrypty" width="100%"><br><b>Sceny i skrypty</b> <code>custom:nuvio-scenes-card</code><br>Kilka scen lub skryptów jako przyciski z animacją potwierdzenia. <code>scene.*</code>, <code>script.*</code>.</td>
<td width="50%" valign="top"><img src="../components/script.png" alt="Skrypt" width="100%"><br><b>Skrypt</b> <code>custom:nuvio-script-card</code><br>Pojedynczy kafel uruchamiający skrypt. <code>script.*</code>, <code>scene.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="../components/sensors.png" alt="Czujniki" width="100%"><br><b>Czujniki</b> <code>custom:nuvio-sensors-card</code><br>Automatycznie wykryte czujniki ruchu, obecności, drzwi, okien, zalania i inne, z filtrami. <code>binary_sensor.*</code>.</td>
<td width="50%"></td>
</tr>
</table>
</details>

<details open>
<summary><b>Energia</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="../components/power.png" alt="Moc teraz" width="100%"><br><b>Moc teraz</b> <code>custom:nuvio-power-card</code><br>Moc chwilowa z linią z ostatnich godzin. <code>sensor.*</code> z <code>device_class: power</code>.</td>
<td width="50%" valign="top"><img src="../components/phases.png" alt="Fazy" width="100%"><br><b>Fazy</b> <code>custom:nuvio-phases-card</code><br>Moc, napięcie i prąd na każdej fazie z paskami obciążenia. Czujniki mocy, napięcia i prądu dla faz.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="../components/energy-stats.png" alt="Energia (statystyki)" width="100%"><br><b>Energia (statystyki)</b> <code>custom:nuvio-energy-stats-card</code><br>Zużycie i produkcja: dziś, tydzień, miesiąc, z wykresem. Statystyki długoterminowe albo ustawienia panelu Energia HA.</td>
<td width="50%" valign="top"><img src="../components/week.png" alt="Energia: tydzień" width="100%"><br><b>Energia: tydzień</b> <code>custom:nuvio-week-card</code><br>Zużycie z sieci i produkcja PV z 7 dni. Statystyki energii.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="../components/solar.png" alt="Solar" width="100%"><br><b>Solar</b> <code>custom:nuvio-solar-card</code><br>Produkcja PV z ostatnich dni jako wykres. Jedna statystyka energii i opcjonalny czujnik „dziś”.</td>
<td width="50%" valign="top"><img src="../components/pv.png" alt="Fotowoltaika" width="100%"><br><b>Fotowoltaika</b> <code>custom:nuvio-pv-card</code><br>Stan falownika, moc teraz, energia dziś, stringi i temperatura. Czujniki falownika.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="../components/flow.png" alt="Przepływ energii" width="100%"><br><b>Przepływ energii</b> <code>custom:nuvio-flow-card</code><br>Sieć, panele, bateria i dom na jednym schemacie. Po liniach płyną świecące kropki, szybciej przy większej mocy; pierścień domu pokazuje, skąd bierze prąd, a pierścień baterii jej naładowanie. Czujniki mocy (W albo kW) sieci, paneli i baterii, poziom baterii, opcjonalnie zużycie domu.</td>
<td width="50%" valign="top"></td>
</tr>
</table>
</details>

<details open>
<summary><b>Multimedia i kamery</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="../components/players.png" alt="Multimedia" width="100%"><br><b>Multimedia</b> <code>custom:nuvio-players-card</code><br>Wszystkie odtwarzacze: okładka, tytuł, postęp, sterowanie, głośność i źródło. <code>media_player.*</code> (wykrywane automatycznie).</td>
<td width="50%" valign="top"><img src="../components/media.png" alt="Odtwarzacz" width="100%"><br><b>Odtwarzacz</b> <code>custom:nuvio-media-card</code><br>Kompaktowa karta jednego odtwarzacza. <code>media_player.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="../components/camera.png" alt="Kamera" width="100%"><br><b>Kamera</b> <code>custom:nuvio-camera-card</code><br>Migawka odświeżana co kilka sekund, podgląd na żywo po dotknięciu. <code>camera.*</code>.</td>
<td width="50%" valign="top"><img src="../components/cameras.png" alt="Kamery" width="100%"><br><b>Kamery</b> <code>custom:nuvio-cameras-card</code><br>Działające kamery jako duże kafle, niedostępne zwinięte do chipów. <code>camera.*</code>.</td>
</tr>
</table>
</details>

<details open>
<summary><b>Domownicy i kalendarz</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="../components/people.png" alt="Domownicy" width="100%"><br><b>Domownicy</b> <code>custom:nuvio-people-card</code><br>Wszyscy z awatarem, strefą i czasem od zmiany. <code>person.*</code>, opcjonalnie <code>zone.*</code>.</td>
<td width="50%" valign="top"><img src="../components/person.png" alt="Osoba" width="100%"><br><b>Osoba</b> <code>custom:nuvio-person-card</code><br>Jedna osoba z awatarem i strefą. <code>person.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="../components/agenda.png" alt="Agenda" width="100%"><br><b>Agenda</b> <code>custom:nuvio-agenda-card</code><br>Nadchodzące wydarzenia pogrupowane po dniach, kolor na kalendarz. <code>calendar.*</code>.</td>
<td width="50%" valign="top"><img src="../components/month.png" alt="Miesiąc" width="100%"><br><b>Miesiąc</b> <code>custom:nuvio-month-card</code><br>Siatka miesiąca z kropkami wydarzeń i listą wybranego dnia. <code>calendar.*</code>.</td>
</tr>
</table>
</details>

<details open>
<summary><b>Bezpieczeństwo i urządzenia</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="../components/alarm.png" alt="Alarm" width="100%"><br><b>Alarm</b> <code>custom:nuvio-alarm-card</code><br>Stan alarmu i tryby uzbrajania wg obsługiwanych funkcji, z klawiaturą kodu. <code>alarm_control_panel.*</code>.</td>
<td width="50%" valign="top"><img src="../components/robots.png" alt="Roboty" width="100%"><br><b>Roboty</b> <code>custom:nuvio-robots-card</code><br>Odkurzacze i kosiarki: stan, start, baza, lokalizacja, moc ssania i ostatnie sprzątanie. <code>vacuum.*</code>, <code>lawn_mower.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="../components/net.png" alt="Sieć" width="100%"><br><b>Sieć</b> <code>custom:nuvio-net-card</code><br>Stan internetu, opóźnienie i prędkość; inne sekcje: bramka, punkty dostępowe, Wi-Fi i klienci. Encje UniFi.</td>
<td width="50%"></td>
</tr>
</table>
</details>

<details open>
<summary><b>Pokoje i nawigacja</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="../components/areas.png" alt="Pokoje" width="100%"><br><b>Pokoje</b> <code>custom:nuvio-areas-card</code><br>Wszystkie obszary HA: temperatura, wilgotność, światła, ruch, klimatyzacja. Rejestr obszarów.</td>
<td width="50%" valign="top"><img src="../components/room.png" alt="Pokój" width="100%"><br><b>Pokój</b> <code>custom:nuvio-room-card</code><br>Wszystkie encje pokoju pogrupowane wg rodzaju (światła, klimatyzacja, rolety, przełączniki…). Adres <code>?area=<id></code>. Pusty pokój proponuje import z obszaru albo własny układ.<br><img src="../components/empty-room.png" alt="Pusty pokój: import z obszaru" width="100%"></td>
</tr>
<tr>
<td width="50%" valign="top"><img src="../components/link.png" alt="Link" width="100%"><br><b>Link</b> <code>custom:nuvio-link-card</code><br>Kafel nawigacji lub akcji. Dowolna ścieżka lub akcja.</td>
<td width="50%"></td>
</tr>
</table>
</details>

<details open>
<summary><b>Podstawowe sterowanie</b></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="../components/slider.png" alt="Suwak" width="100%"><br><b>Suwak</b> <code>custom:nuvio-slider-card</code><br>Suwak do jasności, głośności, prędkości wentylatora, pozycji rolety lub wartości liczbowej, poziomy albo pionowy. <code>light.*</code>, <code>media_player.*</code>, <code>fan.*</code>, <code>cover.*</code>, <code>valve.*</code>, <code>input_number.*</code>, <code>number.*</code>.</td>
<td width="50%" valign="top"><img src="../components/button.png" alt="Przycisk" width="100%"><br><b>Przycisk</b> <code>custom:nuvio-button-card</code><br>Przycisk uruchamiający skrypt, scenę, przycisk lub dowolną akcję, jako kafel albo pigułka, z potwierdzeniem Wykonano. <code>script.*</code>, <code>scene.*</code>, <code>button.*</code>, <code>input_button.*</code>, <code>automation.*</code> lub dowolna <code>tap_action</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="../components/entities.png" alt="Lista encji" width="100%"><br><b>Lista encji</b> <code>custom:nuvio-entities-card</code><br>Lista encji z przełącznikiem, przyciskiem Uruchom lub wartością w każdym wierszu. <code>light.*</code>, <code>switch.*</code>, <code>fan.*</code>, <code>input_boolean.*</code>, <code>script.*</code>, <code>scene.*</code>, <code>button.*</code>, <code>sensor.*</code>, <code>binary_sensor.*</code> i inne encje tylko do odczytu.</td>
<td width="50%" valign="top"><img src="../components/select.png" alt="Wybór" width="100%"><br><b>Wybór</b> <code>custom:nuvio-select-card</code><br>Wybór opcji jako chipy albo lista. <code>input_select.*</code>, <code>select.*</code>.</td>
</tr>
<tr>
<td width="50%" valign="top"><img src="../components/stepper.png" alt="Licznik" width="100%"><br><b>Licznik</b> <code>custom:nuvio-stepper-card</code><br>Licznik ze zwiększaniem, zmniejszaniem i resetem albo zmiana wartości o krok. <code>counter.*</code>, <code>input_number.*</code>, <code>number.*</code>.</td>
<td width="50%" valign="top"><img src="../components/gauge.png" alt="Wskaźnik" width="100%"><br><b>Wskaźnik</b> <code>custom:nuvio-gauge-card</code><br>Wskaźnik łukowy pokazujący wartość czujnika, z zakresem dobranym do jednostki. <code>sensor.*</code>, <code>input_number.*</code>, <code>number.*</code>.</td>
</tr>
</table>
</details>

**Pozostałe karty**

- `custom:nuvio-map-card`: natywna mapa HA w szklanej ramce (bez zrzutu: kafelki mapy wymagają internetu).
- `custom:nuvio-energy-card`: procent obciążenia (suma faz względem mocy maksymalnej) (bez zrzutu: poza siatką o stałej wysokości renderuje się niepoprawnie).
- `custom:nuvio-bars-card`: dzienne słupki zużycia ze statystyk (bez zrzutu: ten sam problem z wysokością).
  - `custom:nuvio-gauge-card`: wartość czujnika liczbowego na łuku.
- `custom:nuvio-page`: sam pełnoekranowy układ (pasek, szyna, nagłówek, panel kart); używają go wszystkie zrzuty powyżej.

## Więcej kart i biblioteka formularzy (1.2.0)

Siedem nowych kart w **+ Dodaj**, każda z podglądem na żywo i formularzem. Odpowiadają kartom Home Assistant o tej samej nazwie, w szkle Nuvio.

| Karta | Co robi | Opcje |
|---|---|---|
| `custom:nuvio-conditional-card` | Pokazuje swoje karty tylko przy spełnionych warunkach (w trybie edycji zawsze widoczne) | `cards`, `conditions` (`state`, `state_not`, `numeric_state` z `above` / `below`, `screen` z `media_query`, `user` z `users`, `and`, `or`) |
| `custom:nuvio-glance-card` | Kilka encji w rzędzie: ikona, nazwa i stan; dotknięcie otwiera szczegóły | `entities`, `title`, `columns`, `show_name`, `show_state` |
| `custom:nuvio-stat-card` | Minimum, średnia, maksimum i zmiana czujnika z wykresem, za 24 godziny, 7 lub 30 dni | `entity`, `name`, `icon`, `hours`, `decimals` |
| `custom:nuvio-humidifier-card` | Docelowa wilgotność na łuku, bieżąca wilgotność i pigułki trybów | `entity`, `name` |
| `custom:nuvio-purifier-card` | Oczyszczacz powietrza: duży odczyt PM2.5 odliczany do nowej wartości, etykieta jakości powietrza, fale powietrza wokół liczby (szybsze w Turbo, wolniejsze w trybie Sen), włącznik i tryby z przesuwanym podświetleniem | `entity` (fan), `pm` (czujnik PM2.5, automatycznie), `name`, `title`, `modes` |
| `custom:nuvio-smartlock-card` | Inteligentny zamek: animowana kłódka w okrągłym przycisku (pałąk podnosi się po otwarciu), przytrzymanie do otwarcia z wypełniającym się pierścieniem, zamykanie dotknięciem, kręcący się łuk w trakcie ruchu, impuls po zmianie, potrząśnięcie przy zacięciu, bateria i czujnik drzwi z tego samego urządzenia, przycisk otwarcia drzwi, gdy zamek to obsługuje | `entity`, `door`, `battery` (automatycznie), `name`, `title`, `hold` |
| `custom:nuvio-timer-card` | Pozostały czas `timer` na łuku, ze startem, pauzą i anulowaniem | `entity`, `name`, `icon` |
| `custom:nuvio-logbook-card` | Ostatnie zmiany wybranych encji z czasem względnym | `entities`, `title`, `hours`, `max` |
| `custom:nuvio-webpage-card` | Dowolny adres `https://`, `http://` albo `/local/` w ramce | `url`, `title`, `aspect_ratio` albo `height` |

Formularze komponentów korzystają teraz z jednej biblioteki formularzy (`hgForm`): pola tekstowe, liczbowe, obszary tekstu (styl kodu dla YAML i JSON), szklane przełączniki, szklane listy wyboru i zwijana sekcja *Zaawansowane*, więc nie zostaje żaden przeglądarkowy checkbox, lista podpowiedzi ani trójkącik rozwijania.

## Kontenery układu (1.1.0)

Siatka, stos pionowy i stos poziomy działają jak w Home Assistant, ale w szkle Nuvio. Są pierwszą grupą w **+ Dodaj**, w sekcji *Układ*. Formularz kontenera pokazuje jego karty: dodasz dowolny komponent, kafelek albo kartę z HA, edytujesz kartę w jej własnym formularzu, zmienisz kolejność przeciągając, zduplikujesz, usuniesz, a w siatce ustawisz, ile kolumn zajmuje karta. Kontenery można zagnieżdżać do trzech poziomów. Kartę z panelu przeniesiesz do kontenera z jej formularza, a kartę z kontenera wyjmiesz z powrotem na panel.

**Karta z HA (YAML)** przyjmuje YAML (albo JSON), który edytor kart Home Assistant pokazuje po wybraniu *Pokaż edytor kodu*. `grid`, `vertical-stack` i `horizontal-stack` stają się kontenerami Nuvio z tymi samymi kartami, każda inna karta jest pokazana bez zmian. Ta sama zamiana działa dla tych typów w konfiguracji strony Nuvio; `keep_ha: true` zostawia oryginalną kartę Home Assistant. Przykład jest w [../examples/containers.yaml](../examples/containers.yaml).

| Karta | Co robi | Opcje |
|---|---|---|
| `custom:nuvio-grid-card` | Karty w kolumnach; na wąskim ekranie mniej kolumn | `cards`, `columns` (1 do 6, 0 = automatycznie), `min_width`, `square`, `gap`, `glass`, `title`; dla karty `span` |
| `custom:nuvio-stack-card` | Karty jedna pod drugą albo obok siebie w jednym szkle; obok siebie przechodzą w pion poniżej `wrap_below` px | `cards`, `direction`, `gap`, `ratio` (np. `[2, 1]`), `wrap_below`, `divider`, `glass`, `title` |

## Karty ogólne i kontenery (0.16.0)

Dwanaście kart zbudowanych wyłącznie ze wspólnych szklanych klocków, więc wyglądają jak projekt wzorcowy i działają z dowolną encją pasującej domeny. Każda dopasowuje się do szerokości: mała (do 220 px) chowa teksty pomocnicze, duża (od 420 px) pokazuje więcej szczegółów. Działają też w zwykłym widoku Home Assistant, gdzie same rozmywają tło. Gotowy pulpit złożony tylko z nich jest w [../examples/inspiration-dashboard.yaml](../examples/inspiration-dashboard.yaml) (działa z integracją demo HA).

<img src="../components/generic-dashboard.webp" alt="Przykładowy pulpit z kart ogólnych" width="100%">

| Karta | Co pokazuje | Główne opcje |
|---|---|---|
| `custom:nuvio-hero-card` | Duże powitanie z imieniem zalogowanej osoby i hasłem, opcjonalnie zdjęcie i jeden stan | `title` (`{name}`), `subtitle`, `image`, `entity` |
| `custom:nuvio-toggle-card` | Jedno urządzenie w wierszu: ikona, nazwa i stan, przełącznik, menu ⋮ | `entity`, `name`, `icon` |
| `custom:nuvio-progress-card` | Wartość na grubym limonkowym pasku, pomarańczowym albo czerwonym powyżej progów | `entity`, `min`, `max`, `warn`, `bad`, `unit` |
| `custom:nuvio-arc-card` | Jasność, prędkość, pozycja, głośność albo liczba na przeciąganym łuku | `entity` (światło, wentylator, roleta, odtwarzacz, liczba) |
| `custom:nuvio-chart-card` | Obszar, linia albo słupki z historii dowolnego czujnika, z ostatnią wartością | `entity`, `hours`, `style: area / line / bars`, `tone: solar` |
| `custom:nuvio-room-compact-card` | Temperatura, wilgotność, przełącznik i linijka jasności | `name`, `temperature`, `humidity`, `entity` |
| `custom:nuvio-actions-card` | Szklana pigułka z okrągłymi przyciskami: sceny, skrypty, usługi, przejścia | `actions: [{ entity }, { icon, name, service, data }, { navigate }]` |
| `custom:nuvio-family-card` | Awatary, kto jest w domu, przycisk dodania osoby | `persons` (puste = wszyscy) |
| `custom:nuvio-cover-card` | Pozycja rolety lub bramy na przeciąganym pasku, otwórz, zatrzymaj, zamknij | `entity` |
| `custom:nuvio-lock-card` | Stan zamka; odblokowanie pyta o potwierdzenie albo o kod, gdy zamek go wymaga | `entity`, `confirm` |
| `custom:nuvio-fan-card` | Prędkość wentylatora na łuku i tryby jako pigułki | `entity` |
| `custom:nuvio-todo-card` | Lista zadań: dodawanie i odhaczanie | `entity`, `show_done` |
| `custom:nuvio-stack-card` | Kilka kart w jednym szkle, pionowo albo poziomo (karty Nuvio i zwykłe karty HA) | `cards`, `direction`, `glass`, `title` |
| `custom:nuvio-tabs-card` | Pigułki (Panel / Pokoje / Urządzenia) przełączające zestawy kart | `tabs: [{ label, icon, cards }]` |

Wszystkie są też w galerii *Dodaj komponent* w edytorze Nuvio.

## Pokoje, AGD i zgodność z Home Glass (0.7.0)

Wszystkie są w **+ Dodaj** w trybie edycji, z podglądem, pełnym formularzem ustawień i polem **Zaawansowana konfiguracja (JSON)** na każdą inną opcję karty (etykiety, kolory, progi, akcje). Wszystko zapisuje się w układzie, więc eksport i import w Kopii układu to przenoszą.

| Komponent | Karta | Ustawienia w formularzu |
|---|---|---|
| Pokoje | `custom:nuvio-areas-card` | ścieżka widoku pokoju; nazwy, ikony, kolejność, czujniki temperatury i wilgotności oraz pokoje własne w Wygląd, Pokoje |
| Pokój | `custom:nuvio-room-card` | pokój do pokazania (albo pokój z adresu) |
| Urządzenie AGD | `custom:nuvio-appliance-card` | dowolna encja urządzenia; pralka, suszarka i zmywarka pokazują stan, program, czas do końca i postęp |
| Ciepła woda | `custom:nuvio-cwu-card` | podgrzewacz, stan grzania, moc, czas nagrzewania, zużycie, utrzymanie temperatury, przełączniki |
| Schody | `custom:nuvio-stairs-card` | światło i czujnik ruchu na dole i na górze, grupa świateł, automatyzacja sekwencji |
| Ceny paliw | `custom:nuvio-fuel-card` | czujniki cen z etykietami i opcjonalny czujnik zmiany na jutro |
| Klimatyzacja (karta) | `custom:nuvio-ac-card` | encja climate, tytuł |
| Pilot klimatyzacji | `custom:nuvio-acremote-card` | encja climate, tytuł |
| Energia, tydzień | `custom:nuvio-week-card` | czujniki zużycia i produkcji, liczba dni, cel po dotknięciu |
| Fazy | `custom:nuvio-phases-card` | moc, napięcie i prąd każdej fazy, maksymalna moc łączna i fazy |
| Fotowoltaika | `custom:nuvio-pv-card` | moc, produkcja dziś, stan i temperatura falownika, stringi |
| Przepływ energii | `custom:nuvio-flow-card` | moc sieci (+ pobór, − oddawanie, kilka czujników się sumuje, np. fazy) albo osobne czujniki oddawania, moc paneli (kilka się sumuje, np. falowniki), baterie każda osobno (listy `battery` i `battery_soc` w tej samej kolejności albo `batteries: [{ power, soc, name }]`, do 4), zużycie domu (puste = z bilansu), odwrócenie znaku sieci albo baterii |
| Sieć | `custom:nuvio-net-card` | sekcja (internet, brama, Wi-Fi, urządzenia, klienci), tytuł |
| Czujniki domu | `custom:nuvio-sensors-card` | rodzaje czujników, dodatkowe i pominięte czujniki |
| Skrót | `custom:nuvio-link-card` | tytuł, podtytuł, encja, ścieżka lub adres do otwarcia |
| Osoba | `custom:nuvio-person-card` | osoba, etykiety w domu i poza domem |
| Dziecko (LiveKid) | `custom:nuvio-kid-card` | tytuł, dziecko (imię) albo encja przy kilkorgu dzieci; encje integracji LiveKid są wykrywane same |

**Wygląd, Pokoje**: zmiana nazw, ikon i kolejności, ukrywanie pokoi, wybór czujnika temperatury i wilgotności na kaflu każdego pokoju (automatycznie, dowolny czujnik albo brak) oraz pokoje własne z dowolnymi encjami, niezależne od obszarów Home Assistant. Encje można też ręcznie przypisać do istniejących pokoi.

**Wygląd, Nagłówek i nawigacja**: tytuł i podtytuł domowników (albo bez paska domowników), ceny paliw w nagłówku pulpitu i cztery widoki na pasku telefonu.

**Wygląd, Galeria teł**: własne zdjęcia z adresu `/local/` albo `https://`; pojawiają się w sekcji Tło i w pokazie slajdów tabletu ściennego.

**Wygląd, Nagłówek i nawigacja** (0.8.0) ma też: encję pogody w nagłówku i opcjonalny czujnik z atrybutem `forecast` dla paska prognozy godzinowej, położenie paska domowników (po lewej albo przy panelu), oraz tabelę widoków z ikoną, krótką etykietą na pasek telefonu, liczbą kolumn na komputerze i tablecie (także w widokach wbudowanych), obecnością w pasku bocznym i kolejnością w nim. **Galeria teł** ma punkt ostrości bieżącego tła.

**Ustawienia** (0.9.0): Wygląd to teraz osobny panel ustawień z kartami: Wygląd, Widoki, Pokoje, Nagłówek i nawigacja, Tła, Wygaszacz i Kopia zapasowa. Tabela ustawień widoków ma podpisane kolumny, a na telefonie zamienia się w karty z etykietami.

**Więcej komponentów w + Dodaj** (0.9.0): światło z jasnością, termostat, duża wartość, wykres historii, drzwi i okna, baterie, odkurzacz, mini odtwarzacz, zegar, słońce, notatka, obraz lub strona oraz aktualizacje. Każdy ma podgląd na żywo, pola formularza i trafia do eksportu i importu.

