import os, sys, json, tempfile, unittest
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
import i18n_compile as C

EN = {'_meta': {'name': 'English', 'locale': 'en'}, 'common': {'save': 'Save'}, 'cards': {'x': {'title': 'T', 'n_one': '{count} item', 'n_other': '{count} items'}}, 'states': {'docked': 'Docked'}}
FR = {'_meta': {'name': 'Français', 'locale': 'fr-FR'}, 'common': {'save': 'Enregistrer'}, 'states': {'docked': 'Rangé'}}

class Flat(unittest.TestCase):
    def test_flatten_groups_plural_forms_and_skips_meta(self):
        f = C.flatten(EN)
        self.assertEqual(f['cards.x.n'], {'one': '{count} item', 'other': '{count} items'})
        self.assertEqual(f['common.save'], 'Save'); self.assertEqual(f['states.docked'], 'Docked')
        self.assertFalse([k for k in f if k.startswith('_meta')])
    def test_assign_indices_sorted_stable_no_dynamic(self):
        idx = C.assign_indices(C.flatten(EN))
        self.assertEqual(list(idx), ['cards.x.n', 'cards.x.title', 'common.save']); self.assertEqual(list(idx.values()), [0, 1, 2])
        self.assertEqual(idx, C.assign_indices(C.flatten(EN)))
        self.assertFalse([k for k in idx if k.startswith(C.DYN_PREFIXES)])
    def test_compile_catalog(self):
        idx = C.assign_indices(C.flatten(EN)); c = C.compile_catalog(C.flatten(FR), idx, FR['_meta'])
        self.assertEqual(c['m'], {'name': 'Français', 'locale': 'fr-FR'})
        self.assertEqual(c['t'][idx['common.save']], 'Enregistrer'); self.assertIsNone(c['t'][idx['cards.x.title']])
        self.assertEqual(c['d'], {'states.docked': 'Rangé'}); self.assertEqual(len(c['t']), len(idx))
    def test_compile_plural_forms_kept_as_object(self):
        idx = C.assign_indices(C.flatten(EN)); c = C.compile_catalog(C.flatten(EN), idx, EN['_meta'])
        self.assertEqual(c['t'][idx['cards.x.n']], {'one': '{count} item', 'other': '{count} items'})

class Rewrite(unittest.TestCase):
    idx = {'common.save': 0, 'a.b': 7}
    def test_hgT(self): self.assertEqual(C.rewrite_keys("x = hgT('common.save')", self.idx), 'x = hgT(0)')
    def test_hgT_params(self): self.assertEqual(C.rewrite_keys('hgT( "a.b" , {n:1})', self.idx), 'hgT( 7 , {n:1})')
    def test_hgTLazy(self): self.assertEqual(C.rewrite_keys("hgTLazy('a.b', p)", self.idx), 'hgTLazy(7, p)')
    def test_hgTO(self): self.assertEqual(C.rewrite_keys("hgTO(o, { a: 'common.save', 'b': \"a.b\" })", self.idx), "hgTO(o, { a: 0, 'b': 7 })")
    def test_hgTO_object_first_arg(self): self.assertEqual(C.rewrite_keys("hgTO({ id: 'x' }, { a: 'common.save' })", self.idx), "hgTO({ id: 'x' }, { a: 0 })")
    def test_dynamic_intact(self):
        s = "hgT('states.' + s); hgTD('states.' + s, fb); hgT(`weather.${w}`)"; self.assertEqual(C.rewrite_keys(s, self.idx), s)
    def test_unknown_key(self):
        with self.assertRaises(ValueError): C.rewrite_keys("hgT('nope.key')", self.idx)
        with self.assertRaises(ValueError): C.rewrite_keys("hgTO(o, { a: 'nope.key' })", self.idx)
    def test_other_calls_untouched(self):
        s = "hgTD('states.x', 'y'); const hgT = (key, p) => f(key); hgT(key, p); other('common.save')"; self.assertEqual(C.rewrite_keys(s, self.idx), s)

class Remaining(unittest.TestCase):
    def test_remaining(self):
        self.assertEqual(C.remaining_literals("hgT('a.b'); hgTLazy(\"c.d\", p); hgTO(o, { x: 'e.f', y: 3 })"), ['a.b', 'c.d', 'e.f'])
    def test_clean(self): self.assertEqual(C.remaining_literals("hgT(3); hgT('states.' + s); hgTD('states.x', 'y'); hgTO(o, { x: 4 }); const hgT = (k) => k"), [])

class Locales(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp(); self.src = os.path.join(self.d, 'src'); self.out = os.path.join(self.d, 'out'); os.makedirs(self.src)
        self.w('en', EN); self.w('fr', FR)
    def w(self, c, o):
        with open(os.path.join(self.src, c + '.json'), 'w', encoding='utf-8') as f: json.dump(o, f, ensure_ascii=False)
    def test_manifest_and_hashed_files(self):
        man, en, idx = C.build_locales(self.src, self.out)
        self.assertEqual([m['code'] for m in man], ['en', 'fr']); self.assertIsNone(man[0]['file'])
        self.assertRegex(man[1]['file'], r'^locales/fr\.[0-9a-f]{8}\.json$'); self.assertEqual(man[1]['locale'], 'fr-FR'); self.assertEqual(man[1]['name'], 'Français')
        with open(os.path.join(self.out, os.path.basename(man[1]['file'])), encoding='utf-8') as f: j = json.load(f)
        self.assertEqual(j['t'][idx['common.save']], 'Enregistrer')
        self.assertEqual(en['t'][idx['common.save']], 'Save'); self.assertEqual(en['m']['locale'], 'en')
    def test_same_content_same_name_and_stale_removed(self):
        m1 = C.build_locales(self.src, self.out)[0]; m2 = C.build_locales(self.src, self.out)[0]; self.assertEqual(m1, m2)
        self.w('fr', dict(FR, common={'save': 'Sauver'})); m3 = C.build_locales(self.src, self.out)[0]
        self.assertNotEqual(m1[1]['file'], m3[1]['file'])
        self.assertEqual(sorted(os.listdir(self.out)), [os.path.basename(m3[1]['file'])])
    def test_removed_language_deleted(self):
        C.build_locales(self.src, self.out); os.remove(os.path.join(self.src, 'fr.json')); C.build_locales(self.src, self.out); self.assertEqual(os.listdir(self.out), [])

if __name__ == '__main__': unittest.main()
