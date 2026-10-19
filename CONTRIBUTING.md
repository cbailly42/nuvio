# Contributing to Nuvio

Thank you for helping make Nuvio better. Bug reports, ideas and pull requests are all welcome.

## Reporting a bug or asking for a feature

Open an issue with the bug report or feature request form. For a bug, please include your Home Assistant version, the Nuvio version (shown in the user menu), the browser or app you use and the steps that show the problem. A screenshot or a short video helps a lot.

Security problems are the exception. Please report them privately as described in [SECURITY.md](SECURITY.md).

## Setting up

You need Python 3 and Node.js.

```bash
npm install              # once: esbuild, used to minify the bundle
python3 tools/build.py   # builds dist/nuvio.js and the content hashed core file
python3 tools/guard.py   # fails if any house specific id slipped into dist
for f in dist/*.js; do node --check "$f"; done
```

To try a change, copy everything in `dist/` to `<config>/www/nuvio/` in a test Home Assistant and reload the dashboard.

## How the code is organised

The source is plain JavaScript in `src/parts/`. `tools/build.py` joins the files in a fixed order into one bundle, so there are no imports and load order matters. The section [Source layout](docs/development.md#source-layout) in the development docs explains the folders. A new card goes into `src/parts/cards/<name>-card.part.js` and into the `CARDS` list in `tools/build.py`.

Every new feature has to meet the UI rules in [DESIGN.md](DESIGN.md).

## Rules for changes

- No hard coded entities. Nuvio reads areas, devices and entities from Home Assistant, and `tools/guard.py` rejects ids from a real house.
- Every visible text is written in Polish and English with `hgTr('Polski', 'English')`.
- Colors come from the theme tokens, so light and dark mode both work.
- Animations respect `prefers-reduced-motion`.
- Keep a change focused on one thing.

## Commits, branches and versions

- Branch names use a prefix: `feature/`, `fix/` or `chore/`.
- Commit messages follow Conventional Commits, for example `feat: Air purifier card` or `fix: Stack height in Safari`.
- Versions follow semantic versioning. A new feature raises the minor number and a fix raises the patch number.
- Describe the change in `CHANGELOG.md`, in the Polish changelog in `README.pl.md`, in the component list (`docs/components.md`) and in `docs/STATUS.md`, and update the version in `package.json`.

## Pull requests

Before you open a pull request, run the build, the guard and the syntax check above. Fill in the pull request template and add screenshots for anything visible. A maintainer will review it and may ask for changes.

By contributing you agree that your work is released under the [MIT License](LICENSE).
