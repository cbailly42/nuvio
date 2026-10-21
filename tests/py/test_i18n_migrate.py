import os, sys, csv, json, shutil, tempfile, unittest
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools'))
import i18n_migrate as M

FIX = os.path.join(HERE, 'fixtures', 'migrate')
OCCS = M.extract(FIX)
ROWS = M.propose(OCCS)

def read(*p):
    with open(os.path.join(FIX, 'parts', *p), encoding='utf-8') as f: return f.read()
def occ(file_end, **kw):
    return [o for o in OCCS if o['file'].endswith(file_end) and all(o.get(k) == v for k, v in kw.items())]
def row(file_end, **kw):
    return [r for r in ROWS if r['file'].endswith(file_end) and all(r.get(k) == v for k, v in kw.items())]

class Extract(unittest.TestCase):
    def test_deterministic_order_and_fields(self):
        self.assertEqual([o['file'] for o in OCCS], sorted(o['file'] for o in OCCS))
        for f in ('file', 'line', 'start', 'end', 'kind', 'pl', 'en', 'params', 'manual'): self.assertIn(f, OCCS[0])
        src = read('cards', 'alarm-card.part.js')
        o = occ('alarm-card.part.js', en='Cancel')[0]
        self.assertEqual(src[o['start']:o['end']], "hgTr('Anuluj', 'Cancel')"); self.assertEqual(o['line'], 4); self.assertEqual(o['kind'], 'hgTr')
    def test_gateway_definitions_not_extracted(self):
        self.assertFalse([o for o in OCCS if o['file'].endswith(('hg-core.part.js', 'hg-oss.part.js')) and o['kind'] != 'dict'])
        self.assertFalse(occ('hg-edit.part.js', kind='hgTr', pl='pl'))
    def test_L_is_not_extracted(self):
        self.assertFalse([o for o in OCCS if o['pl'] == 'nie'])
    def test_lazy(self):
        o = occ('alarm-card.part.js', en='Default')[0]; self.assertEqual((o['kind'], o['pl'], o['manual']), ('hgTrLazy', 'Domyślne', None))
    def test_template_param(self):
        o = occ('alarm-card.part.js', en='{m} min ago')[0]
        self.assertEqual((o['params'], o['pl'], o['manual']), (['m'], '{m} min temu', None))
    def test_template_expr_is_manual(self):
        self.assertEqual(occ('alarm-card.part.js', kind='hgTr', manual='expr')[0]['line'], 6)
    def test_concat(self):
        o = occ('alarm-card.part.js', en='Language: ')[0]; self.assertEqual(o['manual'], 'concat')
    def test_object_and_array(self):
        self.assertEqual(occ('alarm-card.part.js', line=8)[0]['manual'], 'object')
        self.assertEqual(occ('alarm-card.part.js', line=9)[0]['manual'], 'array')
    def test_plural(self):
        self.assertEqual({o['manual'] for o in occ('alarm-card.part.js', line=10)}, {'plural'}); self.assertEqual(len(occ('alarm-card.part.js', line=10)), 2)
    def test_hgTrO_entries(self):
        os_ = occ('hg-edit.part.js', kind='hgTrO'); self.assertEqual([(o['pl'], o['en']) for o in os_], [('Przełącznik', 'Switch'), ('Przycisk', 'Button')])
        src = read('hg-edit.part.js')
        self.assertEqual(src[os_[0]['start']:os_[0]['end']], "['Przełącznik', 'Switch']")
    def test_dictionaries(self):
        self.assertEqual({(o['pl'], o['en']) for o in occ('hg-oss.part.js', name='HG_I18N')}, {('Mapa', 'Map'), ('Witaj, {name}!', 'Welcome, {name}!')})
        self.assertEqual(occ('hg-oss.part.js', name='HG_I18N', dkey='hello')[0]['params'], ['name'])
        self.assertEqual(occ('hg-core.part.js', name='HG_PL', dkey='not_home')[0]['en'], 'not home')   # as v2.16.0 showed it in EN
        self.assertEqual(occ('hg-oss.part.js', name='HG_WZ_T', dkey='s')[0]['manual'], 'array')
        self.assertEqual(occ('hg-oss.part.js', name='HG_BG_SET', dkey='kuchnia')[0]['en'], 'Kitchen')
    def test_wx_short_dynamic(self):
        os_ = occ('weather-card.part.js'); self.assertTrue(os_); self.assertEqual({o['manual'] for o in os_}, {'dict-dynamic'})

class Completeness(unittest.TestCase):
    def test_glob_star_in_template_does_not_hide_later_calls(self):
        for en in ('Choose', 'small'): self.assertTrue(occ('toast.part.js', en=en), en)
    def test_nested_call_is_own_row_and_outer_is_expr(self):
        outer = [o for o in occ('toast.part.js', manual='expr') if o['pl'].startswith('Plik')]
        self.assertEqual(len(outer), 1); self.assertTrue(occ('toast.part.js', pl='mały'))
    def test_comments_and_strings_are_not_extracted(self):
        self.assertFalse([o for o in occ('toast.part.js') if o['pl'] in ('Komentarz', 'Blok', 'Napis')])
    def test_every_call_accounted_for(self):
        M.extract(FIX)    # raises when a hgTr( is neither extracted nor in a gateway / dict / comment / string
        with tempfile.TemporaryDirectory() as d:
            os.makedirs(os.path.join(d, 'parts')); p = os.path.join(d, 'parts', 'hg-x.part.js')
            with open(p, 'w', encoding='utf-8') as f: f.write("const a = 1;\nconst b = hgTr('a', 'b');\n")
            self.assertEqual(len(M.extract(d)), 1)
            orig = M.tr_spans; M.tr_spans = lambda s: []     # simulate an extraction hole
            try: self.assertRaises(RuntimeError, M.extract, d)
            finally: M.tr_spans = orig
    def test_real_src_has_the_hg_edit_calls(self):
        occs = M.extract(os.path.join(HERE, '..', '..', 'src'))
        self.assertTrue([o for o in occs if o['en'] == 'Gradient' and o['file'].endswith('hg-edit.part.js')])

class Propose(unittest.TestCase):
    def test_namespaces(self):
        self.assertEqual(M.namespace('parts/cards/alarm-card.part.js'), 'cards.alarm')
        self.assertEqual(M.namespace('parts/hg-edit.part.js'), 'edit')
        self.assertEqual(M.namespace('parts/ui/toast.part.js'), 'ui.toast')
        self.assertEqual(M.namespace('parts/shared/weather.part.js'), 'shared.weather')
        self.assertEqual(M.namespace('parts/cards/media-mini-card.part.js'), 'cards.media_mini')
    def test_slug(self):
        self.assertEqual(M.slug('Hello there my good friend'), 'hello_there_my_good')
        self.assertEqual(M.slug('{m} min ago'), 'min_ago'); self.assertLessEqual(len(M.slug('a' * 30 + ' ' + 'b' * 30)), 40)
    def test_key_from_first_words(self):
        self.assertEqual(row('alarm-card.part.js', en='Cancel')[0]['key'], 'cards.alarm.cancel')
        self.assertEqual(row('alarm-card.part.js', en='{m} min ago')[0]['key'], 'cards.alarm.min_ago')
    def test_common_promotion_at_3_modules(self):
        ks = {r['key'] for r in ROWS if r['en'] == 'Save' and r['kind'] != 'dict'}; self.assertEqual(ks, {'common.save'})
        self.assertEqual(row('alarm-card.part.js', en='Save')[0]['status'], 'review')
    def test_same_en_different_pl_two_keys(self):
        a = row('alarm-card.part.js', en='Close'); self.assertEqual(len(a), 2)
        self.assertEqual({r['key'] for r in a}, {'cards.alarm.close', 'cards.alarm.close_2'}); self.assertEqual({r['status'] for r in a}, {'auto', 'review'})
    def test_same_pair_same_module_shares_key(self):
        ks = {r['key'] for r in row('hg-edit.part.js', kind='hgTr')}; self.assertEqual(len(ks), 1)
    def test_dict_keys(self):
        self.assertEqual(row('hg-oss.part.js', name='HG_I18N', dkey='map')[0]['key'], 'nav.map')
        self.assertEqual(row('hg-oss.part.js', name='HG_WZ_T', dkey='heroS')[0]['key'], 'wizard.hero_s')
        self.assertEqual(row('hg-core.part.js', name='HG_PL', dkey='not_home')[0]['key'], 'states.not_home')
        self.assertEqual(row('hg-oss.part.js', name='HG_BG_SET', dkey='dom-w-lesie')[0]['key'], 'backgrounds.dom_w_lesie')
        self.assertTrue(row('weather-card.part.js')[0]['key'].startswith('weather.'))
    def test_status(self):
        self.assertEqual(row('alarm-card.part.js', en='Cancel')[0]['status'], 'auto')
        self.assertEqual(row('alarm-card.part.js', en='Language: ')[0]['status'], 'manual')
    def test_no_key_is_prefix_of_another(self):
        ks = {r['key'] for r in ROWS}
        self.assertFalse([k for k in ks if any(o.startswith(k + '.') for o in ks)])
    def test_deterministic(self):
        self.assertEqual(ROWS, M.propose(M.extract(FIX)))

class Csv(unittest.TestCase):
    def test_csv_roundtrip_and_keep_existing_keys(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 't.csv'); M.write_csv(ROWS, p)
            with open(p, encoding='utf-8', newline='') as f: rd = list(csv.DictReader(f))
            self.assertEqual(list(rd[0]), ['key', 'file', 'line', 'kind', 'en', 'pl', 'params', 'manual', 'status']); self.assertEqual(len(rd), len(ROWS))
            for r in rd:
                if r['en'] == 'Cancel': r['key'] = 'cards.alarm.dismiss'
            with open(p, 'w', encoding='utf-8', newline='') as f:
                w = csv.DictWriter(f, list(rd[0])); w.writeheader(); w.writerows(rd)
            again = M.propose(M.extract(FIX), existing=M.read_csv(p))
            self.assertEqual([r['key'] for r in again if r['en'] == 'Cancel'], ['cards.alarm.dismiss'])
            self.assertEqual([r['key'] for r in again if r['en'] != 'Cancel'], [r['key'] for r in ROWS if r['en'] != 'Cancel'])

    def test_hand_resolved_manual_rows_survive_propose(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 't.csv'); rows = [dict(r) for r in ROWS]
            wx = [r for r in rows if r['file'].endswith('weather-card.part.js')]; self.assertEqual(len(wx), 2)
            wx[0].update(key='weather.short.partlycloudy', en='Partly cloudy', pl='Częś. zachm.', status='auto')
            wx[1].update(key='weather.short.lightning', en='Storm', pl='Burza', status='auto')
            lg = [r for r in rows if r['en'] == 'Language: '][0]; lg.update(key='cards.alarm.language', en='Language: {name}', pl='Język: {name}', params=['name'], status='auto')
            M.write_csv(rows, p); again = M.propose(M.extract(FIX), existing=M.read_csv(p))
            got = [(r['key'], r['en'], r['pl'], r['status'], r['manual']) for r in again if r['file'].endswith('weather-card.part.js')]
            self.assertEqual(got, [('weather.short.partlycloudy', 'Partly cloudy', 'Częś. zachm.', 'auto', 'dict-dynamic'), ('weather.short.lightning', 'Storm', 'Burza', 'auto', 'dict-dynamic')])
            r = [r for r in again if r['key'] == 'cards.alarm.language'][0]; self.assertEqual((r['en'], r['params'], r['status']), ('Language: {name}', ['name'], 'auto'))
            self.assertEqual(len(again), len(ROWS))
            # an array resolved as one key per element: the extra rows (no call of their own) stay right after the first one
            arr = [r for r in again if r['manual'] == 'array' and r['file'].endswith('hg-oss.part.js')]; self.assertTrue(arr)
            rows2 = [dict(r) for r in again]; i = next(i for i, r in enumerate(rows2) if r['manual'] == 'array' and r['file'].endswith('hg-oss.part.js'))
            rows2[i].update(key='wizard.steps.lang', en='Language', pl='Język', status='auto')
            rows2.insert(i + 1, dict(rows2[i], key='wizard.steps.views', en='Views', pl='Widoki'))
            M.write_csv(rows2, p); third = M.propose(M.extract(FIX), existing=M.read_csv(p)); j = next(i for i, r in enumerate(third) if r['key'] == 'wizard.steps.lang')
            self.assertEqual([(r['key'], r['status'], r['manual']) for r in third[j:j + 2]], [('wizard.steps.lang', 'auto', 'array'), ('wizard.steps.views', 'auto', 'array')])
            self.assertEqual(len(third), len(ROWS) + 1)
            # an unresolved manual row is proposed again as manual
            self.assertEqual({r['status'] for r in again if r['manual'] and r['key'] not in ('cards.alarm.language',) and not r['key'].startswith('weather.short.')}, {'manual'})

    def test_unused_status_kept_and_not_migrated(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 't.csv'); rows = [dict(r) for r in ROWS]; r = [r for r in rows if r['key'] == 'nav.map'][0]; r['status'] = 'unused'
            M.write_csv(rows, p); again = M.propose(M.extract(FIX), existing=M.read_csv(p))
            self.assertEqual([r['status'] for r in again if r['key'] == 'nav.map'], ['unused'])
            self.assertFalse(M.migrates({'status': 'unused'})); self.assertTrue(M.migrates({'status': 'review'}))

def workdir():
    """a writable copy of the fixture tree with seeded catalogs; returns (tmp TemporaryDirectory, root)"""
    t = tempfile.TemporaryDirectory(); root = os.path.join(t.name, 'src')
    shutil.copytree(FIX, root); os.makedirs(os.path.join(root, 'locales'))
    for code, name, loc in (('en', 'English', 'en-GB'), ('pl', 'Polski', 'pl-PL')):
        with open(os.path.join(root, 'locales', code + '.json'), 'w', encoding='utf-8') as f:
            json.dump({'_meta': {'name': name, 'locale': loc}, 'common': {'save': 'Save' if code == 'en' else 'Zapisz'}}, f)
    return t, root
def rd(root, *p):
    with open(os.path.join(root, *p), encoding='utf-8') as f: return f.read()
def cat(root, code): return json.loads(rd(root, 'locales', code + '.json'))
def snapshot(root):
    return {os.path.join(d, f): rd(d, f) for d, _, fs in os.walk(root) for f in fs}
def key_of(rows, file_end, **kw):
    return [r for r in rows if r['file'].endswith(file_end) and all(r.get(k) == v for k, v in kw.items())][0]['key']
def lookup(c, key):
    for k in key.split('.'): c = c[k]
    return c

class Apply(unittest.TestCase):
    def setUp(self):
        self.t, self.root = workdir(); self.addCleanup(self.t.cleanup)
        self.rows = M.propose(M.extract(self.root))
    def test_rewrites_calls_and_writes_catalogs(self):
        M.apply(self.rows, 'cards.alarm', root=self.root)
        src = rd(self.root, 'parts', 'cards', 'alarm-card.part.js')
        kc, kt, kd = (key_of(self.rows, 'alarm-card.part.js', en=e) for e in ('Cancel', '{m} min ago', 'Default'))
        self.assertIn(f"const b = hgT('{kc}');", src)
        self.assertIn(f"const c = hgT('{kt}', {{ m }});", src)
        self.assertIn(f"const ov = hgTLazy('{kd}');", src)
        self.assertEqual(lookup(cat(self.root, 'en'), kt), '{m} min ago'); self.assertEqual(lookup(cat(self.root, 'pl'), kt), '{m} min temu')
        self.assertEqual(lookup(cat(self.root, 'pl'), kc), 'Anuluj')
        self.assertNotIn("hgTr('Anuluj'", src)
    def test_manual_rows_untouched(self):
        before = rd(self.root, 'parts', 'cards', 'alarm-card.part.js'); M.apply(self.rows, 'cards.alarm', root=self.root)
        after = before.splitlines(); now = rd(self.root, 'parts', 'cards', 'alarm-card.part.js').splitlines()
        for n in (6, 7, 8, 9, 10): self.assertEqual(now[n - 1], after[n - 1])
        self.assertNotIn('Language', json.dumps(cat(self.root, 'en')))
    def test_hgTrO_and_common(self):
        M.apply(self.rows, 'edit', root=self.root)
        src = rd(self.root, 'parts', 'hg-edit.part.js'); k1 = key_of(self.rows, 'hg-edit.part.js', en='Switch'); k2 = key_of(self.rows, 'hg-edit.part.js', en='Button')
        self.assertIn(f"{{ tog: '{k1}', btn: '{k2}' }}", src)
        self.assertIn('hgT(', src)
        self.assertIn('const hgTrO =', src)   # the gateway definition is not touched
        self.assertEqual(lookup(cat(self.root, 'en'), k1), 'Switch')
    def test_hgTrO_call_name(self):
        M.apply(self.rows, 'edit', root=self.root)
        self.assertIn('hgTO({}, {', rd(self.root, 'parts', 'hg-edit.part.js'))
    def test_merge_keeps_meta_and_existing_and_format(self):
        M.apply(self.rows, 'cards.alarm', root=self.root)
        raw = rd(self.root, 'locales', 'en.json'); c = json.loads(raw)
        self.assertEqual(c['_meta'], {'name': 'English', 'locale': 'en-GB'}); self.assertEqual(c['common']['save'], 'Save')
        self.assertTrue(raw.endswith('}\n')); self.assertEqual(list(c), ['_meta', 'cards', 'common']); self.assertEqual(raw, M.dump_catalog(c))
        self.assertEqual(list(c['cards']['alarm']), sorted(c['cards']['alarm'])); self.assertIn('\n  "cards": {\n    "alarm": {', raw)
        self.assertIn('Domyślne', rd(self.root, 'locales', 'pl.json'))    # UTF-8, not \u escapes
    def test_conflict_raises_and_writes_nothing(self):
        with open(os.path.join(self.root, 'locales', 'en.json'), 'w', encoding='utf-8') as f:
            kc = key_of(self.rows, 'alarm-card.part.js', en='Cancel'); n = {}; cur = n
            ks = kc.split('.')
            for k in ks[:-1]: cur[k] = {}; cur = cur[k]
            cur[ks[-1]] = 'Abort'; json.dump({'_meta': {'name': 'English', 'locale': 'en-GB'}, **n}, f)
        before = snapshot(self.root)
        with self.assertRaises(Exception): M.apply(self.rows, 'cards.alarm', root=self.root)
        self.assertEqual(snapshot(self.root), before)
    def test_idempotent_after_apply(self):
        M.apply(self.rows, 'cards.alarm', root=self.root)
        again = M.extract(self.root)     # migrated code must not trip the completeness check
        self.assertFalse([o for o in again if o['file'].endswith('alarm-card.part.js') and not o['manual']])
        before = snapshot(self.root); M.apply(self.rows, 'cards.alarm', root=self.root); self.assertEqual(snapshot(self.root), before)
    def test_resolved_manual_writes_catalog_only(self):
        rows = [dict(r) for r in self.rows]
        r = [r for r in rows if r['en'] == 'Language: '][0]; r.update(status='review', en='Language: {name}', pl='Język: {name}', params=['name'], key='cards.alarm.language')
        before = rd(self.root, 'parts', 'cards', 'alarm-card.part.js'); M.apply(rows, 'cards.alarm', root=self.root)
        self.assertEqual(lookup(cat(self.root, 'en'), 'cards.alarm.language'), 'Language: {name}')
        self.assertIn("hgTr('Język: ', 'Language: ') + name", rd(self.root, 'parts', 'cards', 'alarm-card.part.js'))
    def test_ns_selects_by_file(self):
        M.apply(self.rows, 'cards.alarm', root=self.root)
        self.assertIn("hgTr('Zapisz', 'Save')", rd(self.root, 'parts', 'hg-edit.part.js'))   # other module untouched
    def test_csv_rows_join_without_ranges(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 't.csv'); M.write_csv(self.rows, p); M.apply(M.read_csv(p), 'cards.alarm', root=self.root)
        self.assertIn("hgT('", rd(self.root, 'parts', 'cards', 'alarm-card.part.js'))
    def test_syntax_error_after_rewrite_writes_nothing(self):
        before = snapshot(self.root); orig = M.check_syntax
        M.check_syntax = lambda files: (_ for _ in ()).throw(RuntimeError('syntax'))
        try:
            with self.assertRaises(RuntimeError): M.apply(self.rows, 'cards.alarm', root=self.root)
        finally: M.check_syntax = orig
        self.assertEqual(snapshot(self.root), before)

class Verify(unittest.TestCase):
    def setUp(self):
        self.t, self.root = workdir(); self.addCleanup(self.t.cleanup); self.rows = M.propose(M.extract(self.root))
    def test_clean_table_has_no_discrepancy(self):
        self.assertEqual(M.verify(self.rows, root=self.root), [])
    def test_text_difference_is_listed(self):
        rows = [dict(r) for r in self.rows]; [r for r in rows if r['en'] == 'Cancel'][0]['en'] = 'Abort'
        out = M.verify(rows, root=self.root); self.assertEqual(len(out), 1); self.assertIn('alarm-card.part.js', out[0]); self.assertIn('Abort', out[0])
    def test_param_substituted_by_same_token(self):
        rows = [dict(r) for r in self.rows]; r = [r for r in rows if r['en'] == '{m} min ago'][0]
        r['pl'] = '{m} minut temu'; self.assertTrue(M.verify(rows, root=self.root))
        r['pl'] = '{x} min temu'; r['en'] = '{x} min ago'; r['params'] = ['x']
        self.assertEqual(M.verify(rows, root=self.root), [])      # renamed variable: same position, same token
    def test_swapped_params_detected(self):
        rows = [dict(r) for r in self.rows]; r = [r for r in rows if r['en'] == '{m} min ago'][0]
        r['en'] = '{m} min ago {m}'; self.assertTrue(M.verify(rows, root=self.root))
    def test_undeclared_placeholder_is_a_discrepancy(self):
        rows = [dict(r) for r in self.rows]; r = [r for r in rows if r['en'] == 'Cancel'][0]; r['en'] = 'Cancel {x}'
        self.assertTrue(M.verify(rows, root=self.root))
    def test_apply_refuses_on_discrepancy_before_writing(self):
        rows = [dict(r) for r in self.rows]; [r for r in rows if r['en'] == 'Cancel'][0]['pl'] = 'Zmieniono'
        before = snapshot(self.root)
        with self.assertRaises(M.EquivalenceError): M.apply(rows, 'cards.alarm', root=self.root)
        self.assertEqual(snapshot(self.root), before)
    def test_discrepancy_in_other_ns_does_not_block(self):
        rows = [dict(r) for r in self.rows]; [r for r in rows if r['en'] == 'Cancel'][0]['pl'] = 'Zmieniono'
        M.apply(rows, 'edit', root=self.root)
    def test_dict_rows_catalog_only(self):
        M.apply(self.rows, 'oss', root=self.root); k = key_of(self.rows, 'hg-oss.part.js', name='HG_I18N', dkey='hello')
        self.assertEqual(lookup(cat(self.root, 'en'), k), 'Welcome, {name}!')
        self.assertIn("Witaj, {name}!", rd(self.root, 'parts', 'hg-oss.part.js'))
    def test_bad_key_is_a_discrepancy(self):
        rows = [dict(r) for r in self.rows]; [r for r in rows if r['en'] == 'Cancel'][0]['key'] = "bad key'x"
        self.assertTrue(M.verify(rows, root=self.root))

class Round1(unittest.TestCase):
    def setUp(self):
        self.t, self.root = workdir(); self.addCleanup(self.t.cleanup); self.rows = M.propose(M.extract(self.root))
    def resolved(self, **kw):
        rows = [dict(r) for r in self.rows]; r = [r for r in rows if r['en'] == 'Language: '][0]
        r.update(status='review', en='Language: {name}', pl='Język: {name}', params=['name'], key='cards.alarm.language'); r.update(kw); return rows
    # 1. plural-suffix keys
    def test_plural_suffix_key_is_rejected(self):
        rows = [dict(r) for r in self.rows]; [r for r in rows if r['en'] == 'Cancel'][0]['key'] = 'cards.alarm.cancel_one'
        out = M.verify(rows, root=self.root); self.assertTrue([x for x in out if 'plural suffix' in x])
        before = snapshot(self.root)
        with self.assertRaises(M.EquivalenceError): M.apply(rows, 'cards.alarm', root=self.root)
        self.assertEqual(snapshot(self.root), before)
    def test_propose_never_emits_plural_suffix_keys(self):
        occs = [dict(o) for o in OCCS if o['en'] == 'Cancel']; occs[0]['en'] = 'Several sensors in one'; occs[0]['pl'] = 'Kilka czujników w jednym'
        k = M.propose(occs)[0]['key']; self.assertEqual(k, 'cards.alarm.several_sensors_in_one_text')
        old = [{'key': 'cards.alarm.several_sensors_in_one', 'file': occs[0]['file'], 'en': occs[0]['en'], 'pl': occs[0]['pl'], 'status': 'auto'}]
        self.assertEqual(M.propose(occs, existing=old)[0]['key'], 'cards.alarm.several_sensors_in_one_text')   # a bad kept key is re-proposed
    # 2. resolved manual rows
    def test_resolved_concat_ok_and_apply_writes_catalog(self):
        rows = self.resolved(); self.assertEqual(M.verify(rows, root=self.root), [])
        M.apply(rows, 'cards.alarm', root=self.root); self.assertEqual(lookup(cat(self.root, 'pl'), 'cards.alarm.language'), 'Język: {name}')
    def test_resolved_concat_typo_param(self):
        self.assertTrue(M.verify(self.resolved(en='Language: {nmae}', pl='Język: {nmae}', params=['name']), root=self.root))
    def test_resolved_concat_wrong_text(self):
        out = M.verify(self.resolved(en='Lang: {name}'), root=self.root); self.assertTrue([x for x in out if 'en differs' in x])
    def test_resolved_en_pl_placeholder_mismatch(self):
        out = M.verify(self.resolved(pl='Język: {x}', params=['name', 'x']), root=self.root); self.assertTrue([x for x in out if 'different placeholders' in x])
    def test_resolved_undeclared_param(self):
        self.assertTrue(M.verify(self.resolved(params=[]), root=self.root))
    def test_not_verified_list(self):
        rows = [dict(r) for r in self.rows]
        for r in rows:
            if r['file'].endswith('alarm-card.part.js') and r['manual'] in ('plural', 'array'): r['status'] = 'review'
        nv = M.unverified(rows, root=self.root); self.assertTrue([x for x in nv if 'alarm-card.part.js:9' in x and 'array' in x]); self.assertTrue([x for x in nv if '(plural)' in x])
        self.assertEqual(M.verify(rows, root=self.root), [])
        self.assertEqual(M.unverified(self.rows, root=self.root), [])     # unresolved manual rows are skipped, not "unverified"
    def test_concat_chain_with_larger_expression_is_not_verified(self):
        p = os.path.join(self.root, 'parts', 'cards', 'alarm-card.part.js'); src = rd(self.root, 'parts', 'cards', 'alarm-card.part.js')
        with open(p, 'w', encoding='utf-8') as f: f.write(src.replace("hgTr('Język: ', 'Language: ') + name;", "hgTr('Język: ', 'Language: ') + name.toUpperCase();"))
        rows = M.propose(M.extract(self.root)); r = [r for r in rows if r['en'] == 'Language: '][0]; r.update(status='review')
        self.assertTrue([x for x in M.unverified(rows, root=self.root) if 'concat' in x])
    # 3. load-time
    def test_load_time_detection(self):
        lt = {o['en']: o['manual'] for o in OCCS if o['file'].endswith('hg-loadtime.part.js')}
        for en in ('Top', 'Title', 'Object', 'Conditional', 'Template'): self.assertEqual(lt[en], 'load-time', en)
        for en in ('Lazy', 'Map', 'Arrow', 'Arrow block', 'Inside', 'Declaration', 'Expression', 'Field', 'Static field', 'Method', 'Getter', 'Object method', 'Object getter', 'Template in function', 'Confirm', 'By default'):
            self.assertIsNone(lt[en], en)
    def test_load_time_rows_are_manual_and_skipped(self):
        r = row('hg-loadtime.part.js', en='Top')[0]; self.assertEqual((r['manual'], r['status']), ('load-time', 'manual'))
        before = rd(self.root, 'parts', 'hg-loadtime.part.js'); M.apply(self.rows, 'loadtime', root=self.root)
        now = rd(self.root, 'parts', 'hg-loadtime.part.js').splitlines(); old = before.splitlines()
        self.assertEqual(now[0], old[0]); self.assertIn("hgT('", now[5]); self.assertNotIn('hgTr(', now[5])
    # 4. guards
    def test_mixed_hgTrO_raises_and_writes_nothing(self):
        p = os.path.join(self.root, 'parts', 'hg-edit.part.js'); src = rd(self.root, 'parts', 'hg-edit.part.js')
        with open(p, 'w', encoding='utf-8') as f: f.write(src.replace("btn: ['Przycisk', 'Button']", "btn: [a, b]"))
        rows = M.propose(M.extract(self.root)); before = snapshot(self.root)
        with self.assertRaises(RuntimeError): M.apply(rows, 'edit', root=self.root)
        self.assertEqual(snapshot(self.root), before)
    def test_lost_hand_resolved_row_is_reported(self):
        rows = self.resolved(); r = [r for r in rows if r['key'] == 'cards.alarm.language'][0]
        with open(os.path.join(self.root, 'parts', 'cards', 'alarm-card.part.js'), 'w', encoding='utf-8') as f:
            f.write(rd(self.root, 'parts', 'cards', 'alarm-card.part.js').replace("hgTr('Język: ', 'Language: ') + name", "hgT('x') + name"))
        out = M.verify(rows, root=self.root); self.assertTrue([x for x in out if 'matches no call' in x])
        with self.assertRaises(M.EquivalenceError): M.apply(rows, 'cards.alarm', root=self.root)

if __name__ == '__main__': unittest.main()
