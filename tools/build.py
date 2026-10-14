#!/usr/bin/env python3
"""Build dist/home-glass.js from src/parts (tokenizer -> concat). No Home Assistant access, no secrets."""
import os, sys, shutil, subprocess, hashlib, tempfile, json
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Load order matters: one shared script scope, so a file may only use (at load time) what an earlier file defines.
# shared/ = helpers used by more than one card; cards/ = one card per file, in this order (appliance, stairs and cwu extend room).
CORE = ['hg-select.part.js', 'hg-oss.part.js', 'hg-core.part.js', 'hg-styles.part.js']
# ui/ = shared building blocks (morph engine, primitives); loaded before cards so every card can use them
UI = ['ui/ui.part.js', 'ui/morph.part.js', 'ui/icon-button.part.js', 'ui/pill.part.js', 'ui/switch.part.js', 'ui/card-header.part.js', 'ui/big-value.part.js',
      'ui/progress.part.js', 'ui/arc.part.js', 'ui/sparkline.part.js', 'ui/avatar-stack.part.js','ui/toast.part.js','ui/overlay.part.js','ui/history.part.js']
SHARED = [
    'shared/card-utils.part.js',
    'shared/climate-modes.part.js',
    'shared/stats.part.js',
    'shared/avatar.part.js',
    'shared/calendar.part.js',
    'shared/relative-time.part.js',
    'shared/camera.part.js',
    'shared/areas.part.js',
    'shared/media.part.js',
    'shared/energy-prefs.part.js',
    'shared/weather.part.js',
    'shared/confirm.part.js',
    'shared/generic-controls.part.js',
    'shared/compact-cards.part.js',
    'shared/nv-card.part.js',
]
CARDS = [
    'cards/energy-card.part.js',
    'cards/ac-card.part.js',
    'cards/light-card.part.js',
    'cards/switch-card.part.js',
    'cards/solar-card.part.js',
    'cards/bars-card.part.js',
    'cards/media-card.part.js',
    'cards/person-card.part.js',
    'cards/link-card.part.js',
    'cards/map-card.part.js',
    'cards/people-card.part.js',
    'cards/month-card.part.js',
    'cards/agenda-card.part.js',
    'cards/camera-card.part.js',
    'cards/cameras-card.part.js',
    'cards/alarm-card.part.js',
    'cards/sensors-card.part.js',
    'cards/scenes-card.part.js',
    'cards/power-card.part.js',
    'cards/script-card.part.js',
    'cards/week-card.part.js',
    'cards/players-card.part.js',
    'cards/phases-card.part.js',
    'cards/energy-stats-card.part.js',
    'cards/pv-card.part.js',
    'cards/robots-card.part.js',
    'cards/areas-card.part.js',
    'cards/room-card.part.js',
    'cards/appliance-card.part.js',
    'cards/stairs-card.part.js',
    'cards/cwu-card.part.js',
    'cards/weather-card.part.js',
    'cards/net-card.part.js',
    'cards/slider-card.part.js',
    'cards/button-card.part.js',
    'cards/entities-card.part.js',
    'cards/select-card.part.js',
    'cards/stepper-card.part.js',
    'cards/gauge-card.part.js',
    'cards/fuel-card.part.js',
    'cards/clock-card.part.js',
    'cards/note-card.part.js',
    'cards/image-card.part.js',
    'cards/battery-card.part.js',
    'cards/openings-card.part.js',
    'cards/lamp-card.part.js',
    'cards/history-card.part.js',
    'cards/thermo-card.part.js',
    'cards/vacuum-card.part.js',
    'cards/media-mini-card.part.js',
    'cards/value-card.part.js',
    'cards/sun-card.part.js',
    'cards/updates-card.part.js',
    'cards/assist-card.part.js',
    'cards/hero-card.part.js',
    'cards/toggle-card.part.js',
    'cards/progress-card.part.js',
    'cards/arc-card.part.js',
    'cards/fan-card.part.js',
    'cards/chart-card.part.js',
    'cards/room-compact-card.part.js',
    'cards/actions-card.part.js',
    'cards/family-card.part.js',
    'cards/cover-card.part.js',
    'cards/lock-card.part.js',
    'cards/todo-card.part.js',
    'cards/stack-card.part.js',
    'cards/tabs-card.part.js',
]
PAGE = ['hg-roomx.part.js', 'hg-page.part.js', 'hg-edit.part.js', 'hg-lookr.part.js', 'hg-backup.part.js', 'hg-wall.part.js', 'hg-assist.part.js']
PARTS = CORE + UI + SHARED + CARDS + PAGE
import re
def brand(js):
    """Nuvio branding at build time: element tags hg-* -> nuvio-*, storage keys, names. Sources stay in sync with the private build."""
    tags = sorted(set(re.findall(r"hgReg\('(hg-[a-z-]+)'", js)) | {'hg-page'}, key=len, reverse=True)
    for t in tags:
        n = 'nuvio-' + t[3:]
        js = re.sub(r'(?<![-\w])' + re.escape(t) + r'(?![-\w])', n, js)
        js = re.sub(r'(?<![-\w])' + re.escape(t.upper()) + r'(?![-\w])', n.upper(), js)
    for a, b in [('ll-strategy-dashboard-home-glass', 'll-strategy-dashboard-nuvio'), ('home_glass_layout', 'nuvio_layout'), ('/hacsfiles/home-glass/', '/hacsfiles/nuvio/'),
                 ('home-glass:', 'nuvio:'), ("'home-glass'", "'nuvio'"), ('Home Glass – ', 'Nuvio – '), ('Home Glass', 'Nuvio'), ('home-glass', 'nuvio'), ('Witaj w nuvio', 'Witaj w Nuvio'), ('Welcome to nuvio', 'Welcome to Nuvio')]:
        js = js.replace(a, b)
    # window globals get their own namespace, so a private hg-* build loaded as another Lovelace resource cannot share state with Nuvio
    # (a shared window.__hgL made Nuvio save to the other build's layout key, without the screensaver settings). Test hooks keep their names.
    js = re.sub(r'window\.__hg(?!(?:DryRun|Local|VerTest|PvMock|ForceFsOverlay|Calls|Actions)\b)', 'window.__nuvio', js)
    js = re.sub(r'window\.HG_(?=[A-Z])', 'window.NUVIO_', js)
    js = re.sub(r'window\.hg(?=[A-Z])', 'window.nuvio', js)
    return js
LOADER = """/* Nuvio loader. The real bundle is __CORE__ (content-hashed). Do not edit, generated by tools/build.py. */
const HG_BUILD = '__V__';
(() => {
  if (window.__nuvioLoader) return; window.__nuvioLoader = HG_BUILD;
  const base = new URL('./', import.meta.url).href, own = '__CORE__';
  const ok = (c) => typeof c === 'string' && /^nuvio-core\\.[0-9a-f]+\\.js$/.test(c);
  const latest = () => Promise.race([
    fetch(base + 'nuvio-version.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => (j && ok(j.core) ? j.core : null)),
    new Promise((r) => setTimeout(() => r(null), 2500)),
  ]).catch(() => null);
  const load = (c) => import(base + c);
  latest().then((c) => {
    const first = c || own;
    if (c && c !== own) console.info('Nuvio: cached loader', HG_BUILD, 'is stale, loading', c);
    return load(first).catch((e) => (first !== own ? load(own) : latest().then((c2) => (c2 && c2 !== own ? load(c2) : Promise.reject(e)))));
  }).catch((e) => console.error('Nuvio: could not load the bundle', e));
})();
"""
def minify(js):
    """esbuild (npm install, devDependency): spaces, comments and local names out of the code; strings (CSS, HTML) stay as written.
    Without esbuild the build still works, unminified. The file name hash is taken before this step, from the source."""
    eb = os.path.join(R, 'node_modules', '.bin', 'esbuild')
    if not os.path.exists(eb): eb = shutil.which('esbuild')
    if not eb: return js, False
    r = subprocess.run([eb, '--minify', '--format=esm', '--charset=utf8', '--legal-comments=none', '--log-level=error', '--target=es2020'],
                       input=js.encode(), capture_output=True)
    if r.returncode: sys.exit('esbuild failed (syntax error in a part?):\n' + r.stderr.decode()[:3000])
    return r.stdout.decode(), True
def main():
    w = tempfile.mkdtemp(prefix='hgb-')
    try:
        os.makedirs(os.path.join(w, 'www')); os.makedirs(os.path.join(w, 'tt'))
        shutil.copytree(os.path.join(R, 'src', 'parts'), os.path.join(w, 'theme_src'))
        for f in ('theme_tokens.py', 'theme_head.js', 'theme_overrides.json'):
            if os.path.exists(os.path.join(R, 'src', f)): shutil.copy(os.path.join(R, 'src', f), w)
        subprocess.run([sys.executable, os.path.join(w, 'theme_tokens.py')], check=True, cwd=w)
        js = '\n'.join(open(os.path.join(w, 'www', p)).read() for p in PARTS)
        ver = json.load(open(os.path.join(R, 'package.json')))['version'] if os.path.exists(os.path.join(R, 'package.json')) else '0.0.0'
        js = brand(js)   # hash after branding: a build-only change must also give a new content-hashed core name
        v = ver + '+' + hashlib.md5(js.encode()).hexdigest()[:8]
        js = js.replace("'__HG_BUILD__'", "'%s'" % v, 1)
        dd = os.path.join(R, 'dist'); os.makedirs(dd, exist_ok=True)
        # The bundle goes to a content-hashed file (immutable URL, safe to cache forever).
        # dist/nuvio.js is a tiny loader: HACS registers it under one ?hacstag= per version, and HA's
        # service worker (stale-while-revalidate) plus /hacsfiles/ Cache-Control max-age=31 days can keep
        # serving an old copy. The loader asks nuvio-version.json (no-store, unique URL) which core is current.
        h = v.split('+')[1]
        for f in os.listdir(dd):
            if re.fullmatch(r'nuvio-core\.[0-9a-f]+\.js', f): os.remove(os.path.join(dd, f))
        core = 'nuvio-core.%s.js' % h
        js, mini = minify(js)
        open(os.path.join(dd, core), 'w').write(js)
        json.dump({'build': v, 'core': core}, open(os.path.join(dd, 'nuvio-version.json'), 'w'))
        open(os.path.join(dd, 'nuvio.js'), 'w').write(LOADER.replace('__V__', v).replace('__CORE__', core))
        print('built dist/nuvio.js (loader) +', core, v, len(js) // 1024, 'KB', '(minified)' if mini else '(NOT minified: run npm install for esbuild)')
    finally:
        shutil.rmtree(w, ignore_errors=True)
if __name__ == '__main__': main()
