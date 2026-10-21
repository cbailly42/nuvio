#!/usr/bin/env python3
"""i18n control (spec section 6): keyed catalogs src/locales/<code>.json and the hgT / hgTLazy / hgTO / hgTD calls in src/parts.

Code:
  - hgT / hgTLazy keys are string literals; hgTO maps use literal keys; hgTD literal prefixes are declared in DYN_PREFIXES (tools/i18n_compile.py)
  - every key used exists in en.json; every en.json key is used (keys under DYN_PREFIXES are resolved at runtime and exempt)
  - no UI text written in the code (aria-label, title, placeholder, alt, text between tags, DOM text properties, Polish anywhere)
  - no PL/EN text choice (hgTr / hgTrLazy / hgTrO, hgCurLang() === 'pl' | 'en'), except the sites in ALLOW_LANG_CHOICE
Catalogs:
  - valid JSON without duplicate keys, _meta with name and locale
  - same {variables} as English; plural forms required by the language (Intl.PluralRules categories, from Node)
  - English: a plain string using {count} must be split into plural forms
  - REQUIRED languages complete and without obsolete keys (error); other languages: warning with coverage
  - file name = lowercase language code (LANG_CODE: fr, pt-br)
  - no markup in any text (catalog text reaches innerHTML and attributes unescaped): no '<' followed by a letter, '/' or '!'
    (except <word> placeholders that are not HTML element names, e.g. ?area=<id>), no on…= event handler; outside English no straight
    double quote (use the language's typographic quotes), except the v2.16.0 texts in ALLOW_QUOTE
Usage: i18n_check.py [--list] [--json] [--lang <code>] [--root <dir>]   exit 1 on errors (--lang: exit 1 when keys are missing or obsolete)"""
import os, re, sys, json, shutil, subprocess
TOOLS = os.path.dirname(os.path.abspath(__file__))
R = os.path.dirname(TOOLS)
sys.path.insert(0, TOOLS)
from i18n_compile import DYN_PREFIXES, LANG_CODE, flatten, _close, _map_span   # single source for prefixes, language codes and plural handling

REQUIRED = ('en', 'pl', 'fr')
# runtime definitions take non-literal keys by design
RUNTIME_FILES = ('hg-i18n.part.js',)
# literals the heuristic flags but that are data, never displayed: {(file name, exact literal)}. Brand names, units and technical
# words (Nuvio, Home Assistant, Assist, kWh, °C, PM2.5 …) are already accepted by TECH, ids and mdi: icons by NOTPROSE.
ALLOW_TEXT = {
    ('sensors-card.part.js', ' Zajętość'),     # name_strip: suffix removed from HA entity names (matches Polish entity names)
    ('areas.part.js', 'Ruch i obecność'),      # HG_SEC: section id stored in saved layouts (Polish legacy id; label is shared.areas.sections.mot)
}
# hgCurLang() compared with 'pl'/'en' where it does not pick a text (file, snippet of the line)
ALLOW_LANG_CHOICE = (
    # English shows the raw HA state for states without a states.label.* entry (v2.16.0 behaviour, raw value, not a translation)
    ('hg-core.part.js', "stateLabel: (s) => hgTD('states.label.' + s) ?? (hgCurLang() === 'en'"),
    # H.t: English keeps HA's own formatted value instead of the states.* dictionary
    ('hg-core.part.js', "const en = hgCurLang() === 'en';"),
)
# straight double quotes kept outside English: (code, key) of v2.16.0 texts, shown escaped (PL display stays identical to v2.16.0)
ALLOW_QUOTE = {
    ('pl', 'edit.options.note_text'),   # 'Treść (… listy "- ")': hgForm.field label, H.esc
}
HTML_TAGS = frozenset('''a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption center cite code col colgroup data
    datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure font footer form frame frameset h1 h2 h3 h4 h5 h6 head header hgroup hr html
    i iframe img input ins kbd label legend li link main map mark marquee math menu meta meter nav noscript object ol optgroup option output p param picture
    plaintext pre progress q rp rt ruby s samp script search section select slot small source span strike strong style sub summary sup svg table tbody td
    template textarea tfoot th thead time title tr track tt u ul var video wbr xmp'''.split())
MARKUP = re.compile(r"<[A-Za-z/!]")
PLACEHOLDER = re.compile(r"<([a-z]+)>")
HANDLER = re.compile(r"\bon[a-z]+\s*=", re.I)
NODE = shutil.which('node') or '/opt/node22/bin/node'

PL = re.compile(r"[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]|\b(nie|jest|się|oraz|lub|dla|zapisz|usuń|dodaj|wybierz|brak|włącz|wyłącz|edytuj|zamknij|anuluj|gotowe|ustawienia|widok|karta|kafel|tło|pokój|pokoje|zmień|pokaż|ukryj|domyślny|domyślne|szukaj|wróć|dalej|nazwa|ikona|tytuł|kolor|rozmiar|tylko|wszystko|wszyscy|teraz|dzisiaj|jutro|wczoraj|godz|minut|sekund|dni|temperatura|wilgotność|zużycie|moc)\b", re.I)
WORD = re.compile(r"[A-Za-z]{3,}")
# literals that are not prose: ids, css, urls, entity ids, icon names, numbers
NOTPROSE = re.compile(r"^(?:[\w.\-:/#%?&=+@*]+|mdi:[\w-]+|\s*)$")
TECH = re.compile(r"^[\d.,\s~+\-]*(?:min|h|s|kWh(?: PV)?|kW|W|Wh|V|A|Hz|CPU|RAM|BETA|LIVE|PV|EV|AC|DC|UV|PM2\.5|PM10|CO2|VOC|Wi-?Fi|LAN|WAN|IP|MAC|DNS|SSID|Home Assistant|Assist|Nuvio|HACS|Zigbee|Matter|Bluetooth|zł|°C|°F|%|lx|ppm|mdi:…|OK|ID|URL|HTTP|API|alarm|Auto|Turbo|Smart|Standard|Max|Mop|Start|Stop|Eco|Eko)$")
VARS = re.compile(r"\{(\w+)\}")
CHOICE = re.compile(r"\bhgTr(?:Lazy|O)?\s*\(|hgCurLang\(\)\s*[!=]==?\s*(['\"])(?:pl|en)\1|(['\"])(?:pl|en)\2\s*[!=]==?\s*hgCurLang\(\)")

# ---------- JavaScript ----------
def lex(src):
    """[(kind, start, end, text)] kind: str (quoted string body) | tpl (template text part) | lit (whole template) | cmt (comment)"""
    i, n = 0, len(src); out = []
    def tpl(i):  # i at char after backtick; returns index after closing backtick
        buf_start = i; lit0 = i - 1
        while i < n:
            c = src[i]
            if c == '\\': i += 2; continue
            if c == '`': out.append(('tpl', buf_start, i, src[buf_start:i])); out.append(('lit', lit0, i + 1, '')); return i + 1
            if c == '$' and i + 1 < n and src[i + 1] == '{':
                out.append(('tpl', buf_start, i, src[buf_start:i])); i = code(i + 2, '}'); buf_start = i; continue
            i += 1
        return i
    def code(i, end):
        depth = 0
        while i < n:
            c = src[i]
            if c in '\'"':
                q = c; j = i + 1
                while j < n and src[j] != q:
                    if src[j] == '\\': j += 1
                    if src[j] == '\n': break
                    j += 1
                out.append(('str', i + 1, j, src[i + 1:j])); i = j + 1; continue
            if c == '`': i = tpl(i + 1); continue
            if c == '/' and i + 1 < n and src[i + 1] == '/': j = src.find('\n', i); j = n if j < 0 else j; out.append(('cmt', i, j, '')); i = j; continue
            if c == '/' and i + 1 < n and src[i + 1] == '*': j = src.find('*/', i + 2); j = n if j < 0 else j + 2; out.append(('cmt', i, j, '')); i = j; continue
            if c == '/':  # regex literal heuristic: previous non-space char is an operator or ( , = : [ ! & | ? { } ;
                k = i - 1
                while k >= 0 and src[k] in ' \t': k -= 1
                if k < 0 or src[k] in '(,=:[!&|?{};\n' or src[max(0, k - 5):k + 1].endswith('return'):
                    j = i + 1; cls = False
                    while j < n and src[j] != '\n':
                        if src[j] == '\\': j += 2; continue
                        if src[j] == '[': cls = True
                        elif src[j] == ']': cls = False
                        elif src[j] == '/' and not cls: break
                        j += 1
                    i = j + 1; continue
            if c in '({[': depth += 1
            elif c in ')}]':
                if depth == 0 and c == end: return i + 1
                depth -= 1
            i += 1
        return i
    code(0, None); return out

def masked(src, toks):
    """source with comments blanked (newlines kept, so offsets and line numbers hold)"""
    s = list(src)
    for k, a, b, _ in toks:
        if k == 'cmt':
            for i in range(a, b):
                if s[i] != '\n': s[i] = ' '
    return ''.join(s)

def line_of(src, i): return src.count('\n', 0, i) + 1

def calls(code):
    """-> used [(key, pos)], dyn [(literal, is_prefix, pos)], bad [(pos, msg)], spans [(a, b)] of every i18n call"""
    used, dyn, bad, spans = [], [], [], []
    for m in re.finditer(r"\b(hgT|hgTLazy|hgTO|hgTD)\s*\(", code):
        fn, a = m.group(1), m.end()
        try: end = _close(code, a)
        except ValueError: end = len(code)
        spans.append((m.start(), end))
        if fn == 'hgTO':
            sp = _map_span(code[a:end - 1])
            if sp: used += [(x.group(2), a + sp[0] + x.start(2)) for x in re.finditer(r":\s*(['\"])([^'\"\\\n]*)\1", code[a + sp[0]:a + sp[1]])]
            continue
        lit = re.match(r"\s*(['\"])([^'\"\\\n]*)\1\s*(.)", code[a:end])
        nxt = lit.group(3) if lit else None
        if fn == 'hgTD':
            if lit: dyn.append((lit.group(2), nxt == '+', m.start()))
            continue
        if lit and nxt in ',)': used.append((lit.group(2), m.start()))
        else: bad.append((m.start(), '%s() with a non-literal key: %s' % (fn, ' '.join(code[a:min(end - 1, a + 60)].split()))))
    return used, dyn, bad, spans

def hardcoded(src, toks, spans, fname=''):
    """UI text written in the code (heuristic kept from the PL/EN checker) -> [(pos, kind, text)]"""
    bad = []; lits = [(a, b) for k, a, b, _ in toks if k == 'lit']
    inside = lambda a: any(s <= a < e for s, e in spans)
    allowed = lambda v: (fname, v) in ALLOW_TEXT
    for kind, a, b, t in toks:
        if kind not in ('str', 'tpl') or inside(a): continue
        if kind == 'str':
            if not t.strip() or NOTPROSE.match(t) or allowed(t): continue
            if PL.search(t): bad.append((a, 'pl', t)); continue
            if WORD.search(t) and not TECH.match(t) and not re.search(r"[{};<>]", t) and re.search(r"\b(?:textContent|innerText|placeholder|ariaLabel|title)\s*=\s*$", src[max(0, a - 40):a - 1]):
                bad.append((a, 'en-dom', t))
            continue
        t = re.sub(r"/\*.*?\*/", " ", t, flags=re.S)
        if len(re.findall(r"[{};]", t)) >= 3 and re.search(r"[a-z-]+\s*:\s*[^;]+;", t): continue   # css
        found = []
        for m in re.finditer(r"\b(aria-label|title|placeholder|alt)=\"([^\"$]*)\"", t):
            v = m.group(2).strip()
            if v and WORD.search(v) and not NOTPROSE.match(v) and not TECH.match(v) and not allowed(v): found.append((m.group(1), v))
        for m in re.finditer(r">([^<>]+)<", t):
            v = m.group(1).strip()
            if v and WORD.search(v) and not TECH.match(v) and not re.search(r"[{};=]", v) and not allowed(v): found.append(('text', v))
        for v in [x.strip() for x in re.sub(r"<[^>]*>", "\n", t).split('\n')]:
            if v and PL.search(v) and not TECH.match(v) and not allowed(v) and not any(v == x[1] for x in found): found.append(('pl', v))
        bad += [(a, k, v) for k, v in found]
    return bad

def scan_code(root):
    """-> used {key: [where]}, errors"""
    used, errs = {}, []
    base = os.path.join(root, 'src', 'parts')
    for d, _, fs in sorted(os.walk(base)):
        for f in sorted(fs):
            if not f.endswith('.js') or f in RUNTIME_FILES: continue
            p = os.path.join(d, f); rel = os.path.relpath(p, root)
            with open(p, encoding='utf-8') as fh: src = fh.read()
            toks = lex(src); code = masked(src, toks)
            u, dyn, bad, spans = calls(code)
            for k, pos in u: used.setdefault(k, []).append('%s:%d' % (rel, line_of(src, pos)))
            for pos, msg in bad: errs.append('%s:%d %s' % (rel, line_of(src, pos), msg))
            for lit, pre, pos in dyn:
                if not lit.startswith(DYN_PREFIXES): errs.append("%s:%d hgTD() dynamic prefix %r is not declared in DYN_PREFIXES (tools/i18n_compile.py)" % (rel, line_of(src, pos), lit))
                elif not pre: used.setdefault(lit, []).append('%s:%d' % (rel, line_of(src, pos)))
            for m in CHOICE.finditer(code):
                ln = src[src.rfind('\n', 0, m.start()) + 1:src.find('\n', m.start()) if src.find('\n', m.start()) >= 0 else len(src)]
                if any(f == af and snip in ln for af, snip in ALLOW_LANG_CHOICE): continue
                errs.append('%s:%d PL/EN text choice is gone, use hgT keys: %s' % (rel, line_of(src, m.start()), m.group(0)))
            for pos, kind, t in hardcoded(src, toks, spans, f): errs.append('%s:%d hard-coded UI text [%s] %s' % (rel, line_of(src, pos), kind, t[:90]))
    return used, errs

# ---------- catalogs ----------
def load_catalog(path):
    """-> (data or None, [errors])"""
    dups = []
    def hook(pairs):
        seen = set()
        for k, _ in pairs:
            if k in seen: dups.append(k)
            seen.add(k)
        return dict(pairs)
    name = os.path.basename(path)
    try:
        with open(path, encoding='utf-8') as fh: d = json.load(fh, object_pairs_hook=hook)
    except (ValueError, OSError) as e: return None, ['%s: invalid JSON (%s)' % (name, e)]
    errs = ['%s: duplicate key %r' % (name, k) for k in dups]
    if not isinstance(d, dict): return None, errs + ['%s: top level must be an object' % name]
    m = d.get('_meta')
    if not isinstance(m, dict) or not all(isinstance(m.get(k), str) and m.get(k) for k in ('name', 'locale')): errs.append('%s: _meta needs name and locale' % name)
    def leaves(node, pre):
        for k, v in node.items():
            if pre == '' and k == '_meta': continue
            if isinstance(v, dict): leaves(v, pre + k + '.')
            elif not isinstance(v, str): errs.append('%s: %s%s is not a string' % (name, pre, k))
    leaves(d, '')
    return d, errs

def plural_categories(locales):
    """{locale: [categories]} from Intl.PluralRules (Node)"""
    js = 'const L=%s;console.log(JSON.stringify(Object.fromEntries(L.map((l)=>[l,new Intl.PluralRules(l).resolvedOptions().pluralCategories]))))' % json.dumps(sorted(set(locales)))
    r = subprocess.run([NODE, '-e', js], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)

def vars_of(v): return set(VARS.findall(v)) if isinstance(v, str) else set().union(*[set(VARS.findall(x)) for x in v.values() if isinstance(x, str)])

def compare(code, flat, en, cats):
    """errors on shape, plural forms and variables of a catalog against English"""
    errs, f = [], code + '.json'
    for k, ev in en.items():
        if k not in flat: continue
        tv = flat[k]
        if isinstance(ev, str):
            if isinstance(tv, dict): errs.append('%s: %s has plural forms but English has a plain string' % (f, k)); continue
            for x in sorted(VARS.findall(ev)):
                if '{%s}' % x not in tv: errs.append('%s: %s misses variable {%s}' % (f, k, x))
            for x in sorted(set(VARS.findall(tv)) - set(VARS.findall(ev))): errs.append('%s: %s uses unknown variable {%s}' % (f, k, x))
            continue
        if not isinstance(tv, dict): errs.append('%s: %s needs plural forms (%s), found a plain string' % (f, k, ', '.join(cats))); continue
        miss = [c for c in cats if c not in tv]
        if miss: errs.append('%s: %s misses plural forms: %s' % (f, k, ', '.join(miss)))
        allv, need = vars_of(ev), vars_of(ev.get('other', ''))
        for form, s in sorted(tv.items()):
            for x in sorted(set(VARS.findall(s)) - allv): errs.append('%s: %s_%s uses unknown variable {%s}' % (f, k, form, x))
            if form not in ('zero', 'one', 'two'):   # one/zero/two may spell the number out
                for x in sorted(need - set(VARS.findall(s))): errs.append('%s: %s_%s misses variable {%s}' % (f, k, form, x))
    return errs

def unsafe(code, flat):
    """markup, event handlers and (outside English) straight double quotes in the texts of a flattened catalog (all keys, dynamic tables included)"""
    errs, f = [], code + '.json'
    for k, v in sorted(flat.items()):
        for name, s in ([(k, v)] if isinstance(v, str) else [('%s_%s' % (k, form), x) for form, x in sorted(v.items())] if isinstance(v, dict) else []):
            if not isinstance(s, str): continue
            tags = [m for m in MARKUP.finditer(s) if not (PLACEHOLDER.match(s, m.start()) and PLACEHOLDER.match(s, m.start()).group(1) not in HTML_TAGS)]
            if tags: errs.append('%s: %s contains markup (%r): catalog text is inserted as HTML, write plain text' % (f, name, s[tags[0].start():tags[0].start() + 12]))
            if HANDLER.search(s): errs.append('%s: %s contains an event handler attribute (%r)' % (f, name, HANDLER.search(s).group(0)))
            if code != 'en' and '"' in s and (code, k) not in ALLOW_QUOTE: errs.append('%s: %s contains a straight double quote: use typographic quotes (« », „ ”, “ ”)' % (f, name))
    return errs

def diff_keys(flat, en):
    return sorted(k for k in en if k not in flat), sorted(k for k in flat if k not in en)

def check(root=R, required=REQUIRED):
    """-> {errors: [str], warnings: [str], coverage: {code: percent}}"""
    errors, warnings, coverage = [], [], {}
    ld = os.path.join(root, 'src', 'locales')
    codes = sorted(f[:-5] for f in os.listdir(ld) if f.endswith('.json')) if os.path.isdir(ld) else []
    for c in required:
        if c not in codes: errors.append('%s.json is missing (required language)' % c)
    for c in codes:
        if not LANG_CODE.match(c): errors.append('%s.json: invalid language code %r: file names are lowercase codes such as fr or pt-br (the build refuses it)' % (c, c))
    data = {}
    for c in codes:
        d, e = load_catalog(os.path.join(ld, c + '.json')); errors += e
        if d is not None: data[c] = d
    used, ce = scan_code(root); errors += ce
    if 'en' not in data: return {'errors': errors, 'warnings': warnings, 'coverage': coverage}
    en = flatten(data['en'])
    for c in sorted(data): errors += unsafe(c, en if c == 'en' else flatten(data[c]))
    for k, where in sorted(used.items()):
        if k not in en: errors.append('%s: key %r is missing from en.json' % (where[0], k))
    for k in sorted(en):
        if k not in used and not k.startswith(DYN_PREFIXES): errors.append('en.json: %s is not used in src/parts' % k)
    try: cats = plural_categories([(data[c].get('_meta') or {}).get('locale') or c for c in data])
    except (OSError, subprocess.CalledProcessError, ValueError) as e: return {'errors': errors + ['plural categories: cannot run Node (%s)' % e], 'warnings': warnings, 'coverage': coverage}
    loc = lambda c: (data[c].get('_meta') or {}).get('locale') or c
    for k, v in sorted(en.items()):
        if isinstance(v, str) and '{count}' in v: errors.append('en.json: %s uses {count}: split it into plural forms (%s)' % (k, ', '.join('_' + x for x in cats[loc('en')])))
    errors += [e for e in compare('en', en, {k: v for k, v in en.items() if isinstance(v, dict)}, cats[loc('en')]) if 'misses plural forms' in e]
    coverage['en'] = 100.0
    for c in sorted(x for x in data if x != 'en'):
        fl = flatten(data[c]); errors += compare(c, fl, en, cats[loc(c)])
        miss, old = diff_keys(fl, en)
        coverage[c] = round(100 * (len(en) - len(miss)) / len(en), 1) if en else 100.0
        if c in required:
            if miss: errors.append('%s.json: %d keys missing (required language): %s%s' % (c, len(miss), ', '.join(miss[:15]), ' …' if len(miss) > 15 else ''))
            if old: errors.append('%s.json: %d obsolete keys (not in en.json): %s%s' % (c, len(old), ', '.join(old[:15]), ' …' if len(old) > 15 else ''))
        elif miss or old:
            warnings.append('%s.json: %.1f%% coverage (%d missing, %d obsolete) – i18n_check.py --lang %s' % (c, coverage[c], len(miss), len(old), c))
    return {'errors': errors, 'warnings': warnings, 'coverage': coverage}

def main(argv):
    root = R
    if '--root' in argv: root = argv[argv.index('--root') + 1]
    if '--lang' in argv:
        c = argv[argv.index('--lang') + 1]; ld = os.path.join(root, 'src', 'locales')
        en, e1 = load_catalog(os.path.join(ld, 'en.json')); d, e2 = load_catalog(os.path.join(ld, c + '.json'))
        if en is None or d is None: print('\n'.join(e1 + e2) or 'cannot read catalogs'); return 2
        miss, old = diff_keys(flatten(d), flatten(en))
        print('%s: %d missing' % (c, len(miss))); [print('  missing  ', k) for k in miss]
        print('%s: %d obsolete' % (c, len(old))); [print('  obsolete ', k) for k in old]
        return 1 if miss or old else 0
    r = check(root)
    if '--json' in argv: print(json.dumps(r, ensure_ascii=False, indent=1)); return 1 if r['errors'] else 0
    for w in r['warnings']: print('warning:', w)
    if r['errors']:
        print('i18n: %d errors' % len(r['errors']))
        for e in r['errors'][: (10 ** 6 if '--list' in argv else 40)]: print('  ' + e)
        if len(r['errors']) > 40 and '--list' not in argv: print('  … --list for all')
        return 1
    print('i18n OK – keys, catalogs and coverage: ' + ', '.join('%s %.1f%%' % kv for kv in sorted(r['coverage'].items())))
    return 0

if __name__ == '__main__': sys.exit(main(sys.argv[1:]))
