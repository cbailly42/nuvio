# Development

How to build, structure and release Nuvio. For the contribution workflow see [CONTRIBUTING.md](../CONTRIBUTING.md). Back to the [README](../README.md).

See [DESIGN.md](../DESIGN.md) for the UI rules every new feature must meet.


```bash
npm install              # once: esbuild, used to minify the bundle
python3 tools/build.py   # -> dist/nuvio.js
python3 tools/guard.py   # fails if any house-specific id slipped into dist
```

## Source layout

The source is plain JavaScript files that `tools/build.py` joins, in a fixed order, into one bundle (one shared scope, no imports):

| Folder | Content |
|---|---|
| `src/parts/hg-core`, `hg-styles`, `hg-select`, `hg-oss` | base class `HGBase`, theme tokens, glass select, shared helpers |
| `src/parts/shared/` | helpers used by more than one card (weather, calendar, rooms model, generic controls…) |
| `src/parts/cards/` | one card per file, for example `cards/light-card.part.js` |
| `src/parts/hg-page`, `hg-edit`, `hg-wall`, `hg-users`… | dashboard page, edit mode, wall tablet mode, shared dashboard users, backup, Assist |

A new card goes into `src/parts/cards/<name>-card.part.js` and is added to the `CARDS` list in `tools/build.py`. Load order matters: code that runs when the bundle loads (for example `class X extends Y`) may only use what an earlier file defines.

There is no CI/CD: releases and tags are built locally. `tools/release.sh X.Y.Z` bumps the version (`package.json`, README), builds, checks `dist/nuvio.js` (`node --check`) and runs the hardcode guard, commits `chore: release X.Y.Z`, creates the annotated tag `vX.Y.Z`, pushes `main` and the tag, and creates a GitHub release without attached files (HACS then installs the full flat `dist/`):

```bash
./tools/release.sh 0.3.21   # needs a clean tree, gh CLI logged in
```

Add the changelog entry to `CHANGELOG.md` (and the Polish one to `README.pl.md`) before you release: the script only updates the version in `package.json` and the version badge in the README files.

Only tagging by hand: `git fetch origin && git tag -a v2.12.0 origin/main -m "Nuvio 2.12.0" && git push origin v2.12.0`.
