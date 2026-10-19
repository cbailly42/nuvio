# Rozwój

Jak budować, organizować i wydawać Nuvio. Zasady współpracy opisuje [CONTRIBUTING.md](../../CONTRIBUTING.md). Wróć do [README](../../README.pl.md).

Zasady interfejsu, które musi spełniać każda nowa funkcja, opisuje [DESIGN.md](../../DESIGN.md).


```bash
npm install              # raz: esbuild do minifikacji paczki
python3 tools/build.py   # -> dist/nuvio.js
python3 tools/guard.py   # błąd, jeśli do dist trafił identyfikator konkretnego domu
```

## Układ źródeł

Źródła to zwykłe pliki JavaScript, które `tools/build.py` skleja w stałej kolejności w jeden bundle (jeden wspólny zakres, bez importów):

| Folder | Zawartość |
|---|---|
| `src/parts/hg-core`, `hg-styles`, `hg-select`, `hg-oss` | klasa bazowa `HGBase`, tokeny motywu, szklany select, wspólne funkcje |
| `src/parts/shared/` | funkcje używane przez więcej niż jedną kartę (pogoda, kalendarz, model pokoi, kontrolki ogólne…) |
| `src/parts/cards/` | jedna karta w jednym pliku, na przykład `cards/light-card.part.js` |
| `src/parts/hg-page`, `hg-edit`, `hg-wall`, `hg-users`… | strona pulpitu, tryb edycji, tryb tabletu ściennego, użytkownicy wspólnego dashboardu, kopia zapasowa, Assist |

Nową kartę dodajesz jako `src/parts/cards/<nazwa>-card.part.js` i dopisujesz do listy `CARDS` w `tools/build.py`. Kolejność ma znaczenie: kod wykonywany przy ładowaniu bundla (na przykład `class X extends Y`) może używać tylko tego, co definiuje wcześniejszy plik.

Nie ma CI/CD: wydania i tagi buduje się lokalnie. `tools/release.sh X.Y.Z` podbija wersję (`package.json`, README), buduje, sprawdza `dist/nuvio.js` (`node --check`) i guard, robi commit `chore: release X.Y.Z`, tworzy adnotowany tag `vX.Y.Z`, wypycha `main` i tag oraz tworzy wydanie GitHub bez załączników (HACS instaluje wtedy płaski `dist/`):

```bash
./tools/release.sh 0.3.21   # czyste drzewo, zalogowane gh
```

Przed wydaniem dopisz wpis w `CHANGELOG.md` i `CHANGELOG.pl.md`: skrypt aktualizuje tylko wersję w `package.json` i plakietkę wersji w plikach README.

Sam tag ręcznie: `git fetch origin && git tag -a v2.12.0 origin/main -m "Nuvio 2.12.0" && git push origin v2.12.0`.
