[English](../configuration.md) · **Polski** · [Français](../fr/configuration.md)

# Konfiguracja

Opcjonalne ustawienia Nuvio. Wróć do [README](../../README.pl.md).

Opcjonalne ustawienia strategii:

```yaml
strategy:
  type: custom:nuvio
  language: pl        # dowolny dostępny kod języka (en, pl, fr …): domyślny język pulpitu (osobisty wybór w Ustawieniach i tak wygrywa)
```

## Język

Nuvio jest dostępne w kilku językach: dziś po angielsku, po polsku i po francusku, a także w każdym języku dodanym jako katalog (zobacz niżej). Każdy wybiera swój język w **Ustawienia → Wygląd → Język** (*Automatycznie*, a potem po jednym przycisku na każdy dostępny język) albo pozycją języka w menu użytkownika, dostępną dla wszystkich, także bez dostępu do ustawień. Cały pulpit zmienia się od razu, bez przeładowania strony: nawigacja, karty, ustawienia, tryb edycji, komunikaty, liczby i daty. Wybór zapisuje się na tym urządzeniu i na Twoim koncie Home Assistant, więc działa też na innych urządzeniach.

Który język jest używany (wygrywa pierwszy pasujący):

1. Twój wybór w Ustawieniach albo w menu użytkownika.
2. Opcja strategii `language:` (domyślny język pulpitu w YAML). Przyjmuje każdy kod języka, który ma Nuvio (`en`, `pl`, `fr` …); kod regionalny, np. `fr-CA`, oznacza `fr`.
3. Język wybrany w kreatorze pierwszego uruchomienia.
4. Języki przeglądarki w kolejności preferencji: najpierw pełny kod (`pt-br`), potem sam język (`pt`). Jeśli żaden nie jest dostępny, angielski.

Teksty, których brakuje w wybranym języku, wyświetlają się po angielsku.

### Nowy język

Język to jeden plik JSON. Nie trzeba zmieniać kodu.

1. Utwórz `src/locales/<kod>.json`, gdzie `<kod>` to kod języka małymi literami (`de`, `pt-br` …); kontrola i budowanie odrzucają każdą inną nazwę pliku. Najprościej zacząć od kopii `src/locales/en.json`, katalogu wzorcowego.
2. Uzupełnij blok `_meta`:

   ```json
   "_meta": {
     "name": "Deutsch",
     "locale": "de-DE",
     "flag": "🇩🇪",
     "intro": "Oberfläche auf Deutsch"
   }
   ```

   `name` (nazwa języka w tym języku, widoczna przy wyborze języka) i `locale` (daty, liczby i reguły liczby mnogiej) są wymagane. `flag` i `intro` są opcjonalne: kreator pierwszego uruchomienia pokazuje je na kroku wyboru języka (w przeciwnym razie globus i nazwę).
3. Przetłumacz wartości. Zostaw bez zmian klucze, `{zmienne}` i przyrostki liczby mnogiej, i podaj wszystkie formy liczby mnogiej, których potrzebuje Twój język (zobacz [Rozwój](development.md#tłumaczenia)). Brakujący klucz wyświetla się po angielsku. Pisz zwykły tekst: bez znaczników HTML, a poza angielskim bez prostego cudzysłowu `"` (użyj cudzysłowów typograficznych swojego języka); kontrola je odrzuca, bo tekst katalogu trafia na stronę jako HTML.
4. Sprawdź katalog: `python3 tools/i18n_check.py --lang <kod>` wypisuje brakujące i przestarzałe klucze, a `python3 tools/i18n_check.py` sprawdza zmienne, formy liczby mnogiej i `_meta`.
5. Zbuduj: `python3 tools/build.py`. Katalog trafia do `dist/nuvio-locale-<kod>.<hash>.json`, a język do manifestu wbudowanego w bundle: pojawia się w Ustawieniach, w menu użytkownika i w kreatorze, a `language: <kod>` i wykrywanie języka przeglądarki go rozpoznają.

Angielski, polski i francuski muszą być kompletne (`REQUIRED` w `tools/i18n_check.py`); inny język może być niepełny, a kontrola tylko ostrzega i podaje jego pokrycie.

> [!TIP]
> Aby przejąć wygenerowany pulpit jako zwykły YAML, użyj *Przejmij kontrolę* w edytorze pulpitu. Wszystkie karty `custom:nuvio-*` dalej działają.

## Presety

Konfigurację (układ + wygląd) można eksportować i importować jako JSON. Osobiste presety są przechowywane poza repozytorium.
