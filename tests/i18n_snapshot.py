"""Instantané du texte visible de Nuvio (non-régression i18n).

Usage:
  python3 tests/i18n_snapshot.py --lang pl --out tests/out/snap-pl.json [--root <dépôt>]
  python3 tests/i18n_snapshot.py --diff a.json b.json      (code de sortie 1 si différence)

Sert tests/cards-demo.html?lang=<l>&mode=shots et tests/ui-gallery.html?lang=<l> depuis --root (défaut : racine du dépôt),
horloge figée (page.clock.install), puis relève par composant, dans tous les shadow roots : nœuds texte non vides,
aria-label, title, placeholder, alt. JSON trié et stable (clés triées ; ordre DOM conservé dans chaque composant).
Aucune normalisation de valeurs volatiles n'est appliquée : le rendu est déjà déterministe (horloge figée, réseau externe bloqué).
"""
import argparse, difflib, glob, json, os, socket, subprocess, sys, time
from datetime import datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = '/usr/bin/google-chrome'
PAGES = (('cards', 'tests/cards-demo.html?lang={lang}&mode=shots'), ('gallery', 'tests/ui-gallery.html?lang={lang}'))

COLLECT = r"""() => {
  const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'], SKIP = new Set(['STYLE', 'SCRIPT', 'TEMPLATE', 'NOSCRIPT']);
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const walk = (root, out) => {
    for (const n of root.childNodes) {
      if (n.nodeType === 3) { const t = norm(n.nodeValue); if (t) out.push('text: ' + t); }
      else if (n.nodeType === 1) {
        if (SKIP.has(n.tagName)) continue;
        for (const a of ATTRS) { const v = n.getAttribute(a); if (v && norm(v)) out.push(a + ': ' + norm(v)); }
        if (n.shadowRoot) walk(n.shadowRoot, out);
        walk(n, out);
      }
    }
  };
  const units = {}, seen = new Set(), counts = {};
  const add = (key, el) => { counts[key] = (counts[key] || 0) + 1; const k = counts[key] > 1 ? key + '#' + counts[key] : key; const o = []; seen.add(el); walk(el, o);
    // une unité contenue dans une autre est déjà couverte par son parent : on ne la relève qu'une fois, au plus haut niveau
    units[k] = o; };
  const sel = '[data-id], .box, nuvio-gallery';
  const all = [...document.querySelectorAll(sel)].filter((e) => !e.parentElement.closest(sel));
  for (const el of all) {
    let key = el.dataset && el.dataset.id ? 'card:' + el.dataset.id : el.tagName.toLowerCase() === 'nuvio-gallery' ? 'overlays' : 'box:' + norm((el.querySelector('.lab') || { textContent: '' }).textContent);
    add(key, el);
  }
  // reste de la page hors unités (titres, etc.)
  const rest = []; const wr = (n) => { if (n.nodeType === 3) { const t = norm(n.nodeValue); if (t) rest.push('text: ' + t); } else if (n.nodeType === 1 && !SKIP.has(n.tagName)) { if (all.includes(n)) return; for (const a of ATTRS) { const v = n.getAttribute(a); if (v && norm(v)) rest.push(a + ': ' + norm(v)); } for (const c of n.childNodes) wr(c); } };
  wr(document.body); if (rest.length) units['_page'] = rest;
  return units;
}"""

UPGRADE = r"""async () => {
  /* éléments personnalisés réellement définis : attendre leur mise à jour (updateComplete) ; ceux qui ne sont pas définis (hôtes de démo) sont ignorés */
  const els = []; const f = (r) => { for (const e of r.querySelectorAll('*')) { if (e.localName.includes('-') && customElements.get(e.localName)) els.push(e); if (e.shadowRoot) f(e.shadowRoot); } }; f(document);
  await Promise.all(els.map((e) => Promise.race([Promise.resolve(e.updateComplete), new Promise((r) => setTimeout(r, 2000))])));
  return els.length;
}"""


def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


def snapshot(root, lang):
    from playwright.sync_api import sync_playwright
    port = free_port()
    srv = ThreadingHTTPServer(('127.0.0.1', port), partial(Quiet, directory=root))
    Thread(target=srv.serve_forever, daemon=True).start()
    out = {}
    try:
        with sync_playwright() as p:
            kw = {'args': ['--no-sandbox']}
            exe = CHROME if os.path.exists(CHROME) else next(iter(sorted(glob.glob(os.path.join(os.environ.get('PLAYWRIGHT_BROWSERS_PATH', ''), 'chromium-*', 'chrome-linux', 'chrome')))), None)
            if exe: kw['executable_path'] = exe   # sinon Chromium par défaut de Playwright
            b = p.chromium.launch(**kw)
            for name, path in PAGES:
                c = b.new_context(service_workers='block', viewport={'width': 1440, 'height': 900}, color_scheme='dark', locale='pl-PL', timezone_id='Europe/Warsaw')
                c.route('**/*', lambda r: r.continue_() if r.request.url.startswith(f'http://127.0.0.1:{port}/') or r.request.url.startswith('data:') else r.abort())
                pg = c.new_page(); errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
                # horloge figée : installée puis mise en pause, le temps ne s'écoule que par run_for (sinon les durées/relatifs dérivent)
                pg.clock.install(time=datetime(2026, 10, 21, 10, 0)); pg.clock.pause_at(datetime(2026, 10, 21, 10, 0, 1))
                pg.goto(f'http://127.0.0.1:{port}/' + path.format(lang=lang), wait_until='load')
                # calendrier fixe : 12 pas de 500 ms de temps simulé (+ attente réelle pour les E/S), puis plus aucune avancée d'horloge
                for i in range(12):
                    pg.clock.run_for(500); pg.wait_for_timeout(400)
                if not pg.evaluate('window.__ready === true'): raise SystemExit(f'{name}: page not ready')
                prev = None
                for i in range(8):
                    pg.evaluate(UPGRADE); pg.wait_for_timeout(500)
                    cur = pg.evaluate(COLLECT)
                    if cur == prev: break
                    prev = cur
                else:
                    sys.stderr.write(f'warning: {name} did not stabilise\n')
                if errs: sys.stderr.write(f'page errors ({name}): {errs[:5]}\n')
                for k, v in cur.items(): out[f'{name}/{k}'] = v
                c.close()
            b.close()
    finally:
        srv.shutdown()
    return dict(sorted(out.items()))


def flat(d):
    return [f'{k} | {e}' for k, v in sorted(d.items()) for e in v]


def diff(a, b):
    A, B = flat(json.load(open(a, encoding='utf-8'))), flat(json.load(open(b, encoding='utf-8')))
    d = [l for l in difflib.unified_diff(A, B, a, b, lineterm='', n=0)]
    if d: print('\n'.join(d)); return 1
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--lang', choices=('pl', 'en', 'fr')); ap.add_argument('--out'); ap.add_argument('--root', default=os.path.dirname(HERE))
    ap.add_argument('--diff', nargs=2, metavar=('A', 'B'))
    a = ap.parse_args()
    if a.diff: sys.exit(diff(*a.diff))
    if not a.lang or not a.out: ap.error('--lang et --out requis (ou --diff A B)')
    snap = snapshot(os.path.abspath(a.root), a.lang)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, 'w', encoding='utf-8') as f: json.dump(snap, f, ensure_ascii=False, indent=1, sort_keys=True); f.write('\n')
    print(f'{a.out}: {len(snap)} composants, {sum(len(v) for v in snap.values())} entrées')


if __name__ == '__main__': main()
