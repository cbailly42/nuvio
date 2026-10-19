# Przewodnik po funkcjach

Jak działają wspólny dashboard, tryb tabletu ściennego i kopia układu. Wróć do [README](../../README.pl.md).

## Wspólny dashboard

Domyślnie wszyscy widzą ten sam dashboard Nuvio: układ, wygląd, widoki, pokoje i ustawienia tabletu ściennego, które ustawia administrator.

- **Kto edytuje**: administratorzy edytują wspólny dashboard (tryb edycji). Pozostałe osoby widzą go bez przycisku edycji.
- **Własny układ**: w **Ustawienia → Użytkownicy** (tryb edycji, tylko administrator) każdy użytkownik Home Assistant ma przełącznik. Po odznaczeniu osoba dostaje własny układ: zaczyna od kopii wspólnego, widzi przycisk edycji, a jej zmiany dotyczą tylko jej. Ponowne zaznaczenie przywraca wspólny dashboard. Twoje konto zostaje na wspólnym dashboardzie.
- **Kto widzi widok**: w **Ustawienia → Widoki** każdy widok (poza Panelem) ma przycisk z osobami. Domyślnie każdy widok widzą wszyscy; odznacz osobę, żeby ukryć przed nią widok, także w jej własnym układzie. Jej ekran sam się przeładuje i widok zniknie.
- **Na żywo**: zmiany wspólnego dashboardu i listy osób trafiają na otwarte ekrany bez przeładowania.
- **Zapis**: wspólny układ jest w ukrytym pulpicie `nuvio-shared` (*Nuvio (wspólny układ)*, tylko dla administratorów, bez pozycji w pasku bocznym). Zapisywać go mogą tylko administratorzy; nie edytuj go ręcznie. Własne układy zostają w danych użytkownika Home Assistant (`frontend/set_user_data`, klucz `nuvio_layout`), z kopią lokalną dla każdego użytkownika. Ustawienia Assist są zawsze osobiste.
- **Aktualizacja z 1.3.x**: gdy administrator pierwszy raz otworzy Nuvio 1.4.0, jego obecny układ staje się wspólnym dashboardem. Do tego czasu każdy ma własny układ jak wcześniej.

## Tryb tabletu ściennego

Wygaszacz dla tabletu na ścianie. Jest **domyślnie wyłączony**; administrator włącza go w **Wygląd → Tryb tabletu ściennego** (tryb edycji) i zapisuje przyciskiem **Gotowe**.

- **Włącz po bezczynności**: 30 s, 1, 2, 5, 10 lub 30 min bez dotyku, myszy i klawiatury (domyślnie 2 min).
- **Przyciemnienie**: od 0 do 90 %, jak ciemny jest ekran pod zegarem (domyślnie 50 %).
- **Zdjęcie**: tło Twojego dashboardu, pokaz slajdów wbudowanych teł (płynne przejście co 45 s) albo własny adres obrazu (`https://…` lub `/local/…`).
- **Czujnik ruchu**: dowolny `binary_sensor`; czujniki ruchu, obecności i zajętości są na początku listy. Gdy przejdzie w stan `on` w czasie wygaszacza, ekran się wybudza. Bez czujnika budzi tylko dotyk.
- **Wybudzanie**: dotyk, klawisz lub przewinięcie. Pierwszy dotyk tylko budzi ekran i nie naciska kafla pod spodem.
- **Wygląd wygaszacza**: *Zegar na zdjęciu* (opis niżej) albo *Tablica*: jasna lub ciemna tablica z dużym dniem tygodnia albo godziną i datą, wschodem i zachodem słońca, odliczaniem do najbliższego wydarzenia całodniowego, pogodą z prognozą, najbliższymi wydarzeniami, tym, co teraz gra, zdjęciem i temperaturami w pokojach. W trybie Tablica wybierasz motyw (auto według słońca, jasny, ciemny), nagłówek, widoczne elementy, kolejność kart, encję pogody oraz kalendarze i pokoje.
- **Podgląd wygaszacza** pokazuje go od razu; dotknij, aby zamknąć.
- Układ: duży zegar pośrodku (bez panelu pod spodem), data na stałe w lewym dolnym rogu i, jeśli Home Assistant ma encję `weather`, aktualna pogoda (ikona, temperatura, stan) w prawym górnym. Zegar zgadza się z formatem czasu (12 / 24 h) i językiem HA, co minutę lekko zmienia położenie (ochrona paneli OLED), prosi przeglądarkę o niewygaszanie ekranu (Screen Wake Lock) i szanuje ograniczenie ruchu.
- Startuje tylko na dashboardzie Nuvio (nie w trybie edycji i nie w karcie w tle) i jest rysowany nad oknami dialogowymi Home Assistanta.
- **Blokada PIN-em (BETA)**: włącz *Blokadę PIN-em*, ustaw PIN z 4 do 8 cyfr i wybierz, kiedy wygaszacz się blokuje (od razu, po 1, 5, 15 lub 30 min). Zablokowany wygaszacz nie budzi się dotykiem ani czujnikiem ruchu: dotknięcie rozmywa zdjęcie i pokazuje okrągły szklany pinpad z kropkami PIN-u nad nim i przyciskiem **Zablokuj** pod spodem, który wraca do wygaszacza. Po 5 błędnych PIN-ach pinpad czeka 30 s (dłużej po kolejnych próbach), a po 20 s bez dotyku sam się zamyka. **Zablokuj ekran** w menu użytkownika blokuje od razu, a przeładowanie strony nie zdejmuje blokady. Zapisywany jest tylko skrót PIN-u. Blokada chroni tablet przed przypadkowym użyciem i nie zastępuje hasła do Home Assistant.
- Ustawienia są częścią układu: na wspólnym dashboardzie dotyczą wszystkich, a osoba z własnym układem ma własne. Zobacz [Wspólny dashboard](#wspólny-dashboard).

## Kopia układu

Administrator może wyeksportować i zaimportować cały układ Nuvio w **Wygląd → Kopia układu** (tryb edycji).

- **Eksportuj** pobiera plik `nuvio-uklad-RRRR-MM-DD.json`, a **Kopiuj do schowka** kopiuje ten sam JSON. Do wyboru, co zawiera kopia: widoki i własne widoki; układ, widżety z encjami, tytuły, szerokości sekcji i ukryte elementy; wygląd (akcent, tło, przyciemnienie); szerokość paneli widoków.
- **Importuj** przyjmuje plik (wybór lub przeciągnięcie) albo wklejony JSON. Plik jest sprawdzany, a podsumowanie pokazuje liczbę widoków, widżetów, sekcji i encji oraz wyróżnia encje, których brak na tej instancji. Wybierz części do importu oraz **Zastąp** albo **Połącz**.
- Przed importem bieżący układ jest zapisywany jako kopia; **Przywróć poprzedni** w powiadomieniu (albo w sekcji Kopia układu) cofa import jednym kliknięciem.
- Plik ma wersję (`format`, `schema`, `nuvio`, `exported`). Starsze surowe dane układu są konwertowane automatycznie, a pliki z nowszego schematu lub uszkodzone są odrzucane z jasnym komunikatem.
