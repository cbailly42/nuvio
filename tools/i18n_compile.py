#!/usr/bin/env python3
"""i18n build step (spec 3.1 bis): nested source catalogs -> compiled {m, t, d} with integer key indexes, hashed flat files dist/nuvio-locale-<code>.<hash8>.json,
and the source keys in the bundle rewritten to those indexes. Keys exist only in the sources; the bundle carries integers."""
import os, re, json, hashlib
# states. / weather. + per-card option tables read with hgTD (lot C, R14)
DYN_PREFIXES = ('states.', 'weather.',
                'cards.ac.fan_modes.', 'cards.ac.swing_modes.', 'cards.alarm.states.',
                'cards.areas.climate_states.', 'cards.gauge.device_classes.',
                'cards.players.states.', 'cards.purifier.modes.',
                'cards.remote.presets.', 'cards.robots.options.',
                'cards.weather.weekdays.',
                'cards.room.device_states.', 'cards.room.washer_jobs.', 'cards.room.washer_states.', 'cards.room.cover_states.')
PLURAL_SUFFIXES = ('zero', 'one', 'two', 'few', 'many', 'other')
_PL = re.compile(r'^(.+)_(%s)$' % '|'.join(PLURAL_SUFFIXES))
_CALL = re.compile(r'\bhgT(?:Lazy)?\(\s*(?:(?P<lit>(?P<q>[\'"])(?P<k>[^\'"\\\n]*)(?P=q))\s*(?=[,)]))?')
_CALL_OPEN = re.compile(r'\bhgT(?:Lazy)?\(')
_CALLO = re.compile(r'\bhgTO\(')

def flatten(nested):
    """{'a': {'b_one': 'x', 'b_other': 'y'}} -> {'a.b': {'one': 'x', 'other': 'y'}}; top-level _meta ignored."""
    out = {}
    def walk(node, pre):
        for k, v in node.items():
            if isinstance(v, dict): walk(v, pre + k + '.'); continue
            m = _PL.match(k)
            if m and isinstance(v, str): out.setdefault(pre + m.group(1), {})[m.group(2)] = v
            else: out[pre + k] = v
    walk({k: v for k, v in nested.items() if k != '_meta'}, '')
    return out

def assign_indices(en_flat):
    return {k: i for i, k in enumerate(sorted(k for k in en_flat if not k.startswith(DYN_PREFIXES)))}

def compile_catalog(flat, idx, meta):
    t = [None] * len(idx)
    for k, i in idx.items(): t[i] = flat.get(k)
    return {'m': {'name': meta['name'], 'locale': meta['locale']}, 't': t, 'd': {k: v for k, v in sorted(flat.items()) if k.startswith(DYN_PREFIXES)}}

def _close(js, i):
    """index just after the ')' matching the '(' before position i (strings and templates skipped)"""
    depth, n = 1, len(js)
    while i < n:
        c = js[i]
        if c in '\'"`':
            j = i + 1
            while j < n and js[j] != c: j += 2 if js[j] == '\\' else 1
            i = j + 1; continue
        if c in '([{': depth += 1
        elif c in ')]}':
            depth -= 1
            if depth == 0: return i + 1
        i += 1
    raise ValueError('unbalanced hgTO( call')

def _map_span(args):
    """span of the last top-level {...} in the call arguments (the property -> key map)"""
    depth, start, last = 0, None, None; i, n = 0, len(args)
    while i < n:
        c = args[i]
        if c in '\'"`':
            j = i + 1
            while j < n and args[j] != c: j += 2 if args[j] == '\\' else 1
            i = j + 1; continue
        if c in '([{':
            if c == '{' and depth == 0: start = i
            depth += 1
        elif c in ')]}':
            depth -= 1
            if c == '}' and depth == 0 and start is not None: last = (start, i + 1)
        i += 1
    return last

def rewrite_keys(js, idx):
    """hgT('k') / hgTLazy('k') / hgTO(o, { p: 'k' }) -> integer index. 'states.' + x concatenations are left alone; unknown static key -> ValueError."""
    def one(k):
        if k not in idx: raise ValueError('unknown i18n key: ' + repr(k))
        return str(idx[k])
    def call(m):
        return m.group(0) if m.group('k') is None else m.group(0)[:m.start('lit') - m.start()] + one(m.group('k')) + m.group(0)[m.end('lit') - m.start():]
    js = _CALL.sub(call, js)
    out, pos = [], 0
    for m in _CALLO.finditer(js):
        if m.start() < pos: continue
        end = _close(js, m.end()); sp = _map_span(js[m.end():end - 1])
        if not sp: continue
        a, b = m.end() + sp[0], m.end() + sp[1]
        out.append(js[pos:a]); out.append(re.sub(r':\s*(([\'"])([^\'"\\\n]*)\2)', lambda x: x.group(0).replace(x.group(1), one(x.group(3))), js[a:b])); pos = b
    out.append(js[pos:]); return ''.join(out)

def remaining_literals(js):
    """static key literals still present in hgT/hgTLazy/hgTO call shapes (must be empty after rewrite_keys)"""
    r = [m.group('k') for m in _CALL.finditer(js) if m.group('k') is not None]
    for m in _CALL_OPEN.finditer(js):  # any dotted key-looking literal inside the arguments (ternary branches)
        try: end = _close(js, m.end())
        except ValueError: continue
        r += [x.group(2) for x in re.finditer(r'([\'"])([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+)\1', js[m.end():end]) if x.group(2) not in r]
    for m in _CALLO.finditer(js):
        try: end = _close(js, m.end())
        except ValueError: continue
        sp = _map_span(js[m.end():end - 1])
        if sp: r += [x.group(2) for x in re.finditer(r':\s*([\'"])([^\'"\\\n]*)\1', js[m.end() + sp[0]:m.end() + sp[1]])]
    return r

def map_texts(flat, fn):
    """every text of a flattened catalog through fn: plain entries and each plural form (keys untouched)"""
    return {k: ({f: fn(x) for f, x in v.items()} if isinstance(v, dict) else fn(v) if isinstance(v, str) else v) for k, v in flat.items()}

def build_locales(src_dir, out_dir, text=None):
    """-> (manifest, compiled en, idx). Writes out_dir/nuvio-locale-<code>.<hash8>.json (flat: HACS ships only top-level dist files) (hash = md5 of the compiled JSON) and deletes stale hashed files.
    text: optional str -> str applied to every catalog text (t entries, plural forms, d values) before compiling, so the hash covers the result
    (build.py passes its brand(): sources say "Home Glass", the bundle and its catalogs say "Nuvio")."""
    srcs = {}
    for f in sorted(os.listdir(src_dir)):
        if f.endswith('.json'):
            with open(os.path.join(src_dir, f), encoding='utf-8') as fh: srcs[f[:-5]] = json.load(fh)
    if 'en' not in srcs: raise ValueError('src/locales/en.json is required (reference language)')
    for c, s in srcs.items():
        if not isinstance(s.get('_meta'), dict) or not s['_meta'].get('name') or not s['_meta'].get('locale'): raise ValueError('%s.json: _meta needs name and locale' % c)
    fl = lambda c: map_texts(flatten(srcs[c]), text) if text else flatten(srcs[c])
    idx = assign_indices(flatten(srcs['en'])); en = compile_catalog(fl('en'), idx, srcs['en']['_meta'])
    # optional _meta.flag / _meta.intro (the language presenting itself, e.g. in the setup wizard) travel in the manifest
    ext = lambda m: {k: m[k] for k in ('flag', 'intro') if isinstance(m.get(k), str) and m[k]}
    manifest, keep = [{'code': 'en', 'name': en['m']['name'], 'locale': en['m']['locale'], 'file': None, **ext(srcs['en']['_meta'])}], set()
    os.makedirs(out_dir, exist_ok=True)
    for c in sorted(k for k in srcs if k != 'en'):
        body = json.dumps(compile_catalog(fl(c), idx, srcs[c]['_meta']), ensure_ascii=False, separators=(',', ':'))
        name = 'nuvio-locale-%s.%s.json' % (c, hashlib.md5(body.encode('utf-8')).hexdigest()[:8]); keep.add(name)
        with open(os.path.join(out_dir, name), 'w', encoding='utf-8') as fh: fh.write(body)
        manifest.append({'code': c, 'name': srcs[c]['_meta']['name'], 'locale': srcs[c]['_meta']['locale'], 'file': name, **ext(srcs[c]['_meta'])})
    for f in os.listdir(out_dir):
        if re.fullmatch(r'nuvio-locale-[\w-]+\.[0-9a-f]{8}\.json', f) and f not in keep: os.remove(os.path.join(out_dir, f))
    return manifest, en, idx
