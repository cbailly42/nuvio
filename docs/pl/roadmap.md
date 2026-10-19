# Plan rozwoju

Plan kolejnych funkcji; źródłem prawdy jest [STATUS.md](../STATUS.md). Wróć do [README](../../README.pl.md).

| Funkcja | Opis | Status |
|---|---|---|
| Karta Assist / głosowa | rozmowa z Home Assistant Assist w szklanej karcie, z odpowiedzią wyświetlaną na miejscu | gotowe w 0.10.0 |
| Centrum powiadomień | trwałe powiadomienia, słabe baterie, otwarte drzwi i niedostępne urządzenia w jednym panelu | planowane |
| Integracja z panelem Energia | źródła i urządzenia z ustawień Energii w HA zamiast ręcznie wskazanych czujników | w toku: karta Energia · tydzień czyta już zużycie, produkcję i cenę z ustawień Energii HA; karty mocy, faz i fotowoltaiki nadal używają wybranych czujników |
| Poprawka kart energy i bars | poprawne renderowanie `nuvio-energy-card` i `nuvio-bars-card` poza siatką o stałej wysokości | planowane |
| Konfiguracja karty mapy | jasna podpowiedź i zapasowy widok, gdy kafelki mapy są niedostępne, oraz zrzut w README | planowane |
| Układy per urządzenie | osobny układ dla telefonu, tabletu i komputera zamiast jednego wspólnego | planowane |
| Edytor motywu | własne rozmycie szkła, zaokrąglenia, czcionki i palety kolorów poza kolorem akcentu | planowane |
| Udostępnianie presetów | udostępnianie układu i wyglądu jako presetów, z galerią presetów społeczności do importu | planowane |
| Biblioteka komponentów i nowy wygląd | wspólne klocki (szkło, przyciski, przełączniki, pigułki, nakładki), nowe karty ogólne, płynne animacje, aktualizacja na żywo bez przerysowania karty, rozmiary S, M i L dla szerokiego i wąskiego panelu, szybsze ładowanie | gotowe w 1.0.0: karty w osobnych plikach w 0.11.2, nowe szkło i tokeny projektu w 0.12.0, klocki i aktualizacja na żywo w 0.13.0, nakładki w 0.14.0, wszystkie karty na wspólnym wyglądzie i aktualizacji na żywo w 0.15.0, 12 kart ogólnych, stos i zakładki w 0.16.0, mniejsza paczka i wstrzymane karty poza ekranem w 1.0.0 |
| Blokada wygaszacza (BETA) | po dotknięciu wygaszacza okrągły szklany pinpad na rozmytym tle, kropki PIN-u nad nim i przycisk Zablokuj pod spodem; ustawienia PIN-u, czasu blokady i włącz/wyłącz | gotowe w 1.3.0, animacja odblokowania w 1.3.1 |
| Wspólny dashboard | jeden dashboard dla wszystkich użytkowników Home Assistant, ustawiany przez administratora, z możliwością odznaczenia osoby, która dostaje własny układ do edycji (Ustawienia → Użytkownicy) | gotowe w 1.4.0 |
| Widoczność widoków dla osób | wybór, kto widzi który widok; domyślnie każdy widok widzą wszyscy (Ustawienia → Widoki) | gotowe w 1.5.0 |
| Role i uprawnienia | uprawnienia osób poza widokami: kto może edytować wspólny dashboard, otwierać Ustawienia albo zdejmować blokadę PIN-em, ukryte karty lub pokoje dla wybranych osób | planowane |
| Przegląd dostępności | etykiety dla czytników ekranu, kolejność fokusu i audyt kontrastu we wszystkich kartach i trybie edycji | planowane |

Gotowe z poprzedniego planu: edytor widoków (Ustawienia → Widoki), pełne tłumaczenie polskie / angielskie, eksport i import konfiguracji (Ustawienia → Kopia zapasowa), podpowiedzi dla pustego widoku Panel, tryb tabletu ściennego (Ustawienia → Wygaszacz).
