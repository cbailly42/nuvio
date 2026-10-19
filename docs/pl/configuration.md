# Konfiguracja

Opcjonalne ustawienia Nuvio. Wróć do [README](../../README.pl.md).

Opcjonalne ustawienia strategii:

```yaml
strategy:
  type: custom:nuvio
  language: pl        # pl | en: domyślny język pulpitu (osobisty wybór w Ustawieniach i tak wygrywa)
```

## Język

Nuvio mówi po polsku i po angielsku. Każdy wybiera swój język w **Ustawienia → Wygląd → Język** (Automatycznie / Polski / English) albo pozycją języka w menu użytkownika, dostępną dla wszystkich, także bez dostępu do ustawień. Cały pulpit zmienia się od razu, bez przeładowania strony: nawigacja, karty, ustawienia, tryb edycji, komunikaty, liczby i daty. Wybór zapisuje się na tym urządzeniu i na Twoim koncie Home Assistant, więc działa też na innych urządzeniach.

Który język jest używany (wygrywa pierwszy pasujący):

1. Twój wybór w Ustawieniach albo w menu użytkownika.
2. Opcja strategii `language:` (domyślny język pulpitu w YAML).
3. Język wybrany w kreatorze pierwszego uruchomienia.
4. Język przeglądarki: polski, jeśli przeglądarka jest po polsku, w przeciwnym razie angielski.

**Nowy język**: dodaj wpis w `HGLang.LIST` i słownik w `HG_I18N` w `src/parts/hg-oss.part.js`, potem teksty kreatora w `HG_WZ_T`. Teksty kart to pary `hgTr('Polski', 'English')` w miejscu użycia (zobacz `src/parts/hg-core.part.js`); dla nowego języka `hgTr` dostaje kolejny argument.

> [!TIP]
> Aby przejąć wygenerowany pulpit jako zwykły YAML, użyj *Przejmij kontrolę* w edytorze pulpitu. Wszystkie karty `custom:nuvio-*` dalej działają.

## Presety

Konfigurację (układ + wygląd) można eksportować i importować jako JSON. Osobiste presety są przechowywane poza repozytorium.
