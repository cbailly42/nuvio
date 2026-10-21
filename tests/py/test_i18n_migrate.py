import os, sys, csv, tempfile, unittest
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
        self.assertEqual(occ('hg-core.part.js', name='HG_PL', dkey='not_home')[0]['en'], 'not_home')
        self.assertEqual(occ('hg-oss.part.js', name='HG_WZ_T', dkey='s')[0]['manual'], 'array')
        self.assertEqual(occ('hg-oss.part.js', name='HG_BG_SET', dkey='kuchnia')[0]['en'], 'Kitchen')
    def test_wx_short_dynamic(self):
        os_ = occ('weather-card.part.js'); self.assertTrue(os_); self.assertEqual({o['manual'] for o in os_}, {'dict-dynamic'})

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

if __name__ == '__main__': unittest.main()
