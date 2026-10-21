import os, sys, json, shutil, subprocess, tempfile, unittest
HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.join(HERE, '..', '..', 'tools')
sys.path.insert(0, TOOLS)
import i18n_check as K

OK = os.path.join(HERE, 'fixtures', 'check', 'ok')
REQ = ('en', 'pl')

class Fix(unittest.TestCase):
    """each test copies the valid fixture root, applies one fault and expects exactly one error naming it"""
    def setUp(self):
        self.tmp = tempfile.mkdtemp(); self.root = os.path.join(self.tmp, 'r'); shutil.copytree(OK, self.root)
    def tearDown(self): shutil.rmtree(self.tmp)
    def p(self, *a): return os.path.join(self.root, 'src', *a)
    def rd(self, *a):
        with open(self.p(*a), encoding='utf-8') as f: return f.read()
    def wr(self, s, *a):
        with open(self.p(*a), 'w', encoding='utf-8') as f: f.write(s)
    def add_js(self, line): self.wr(self.rd('parts', 'hg-demo.part.js') + line + '\n', 'parts', 'hg-demo.part.js')
    def cat(self, code): return json.loads(self.rd('locales', code + '.json'))
    def put(self, code, d): self.wr(json.dumps(d, ensure_ascii=False, indent=1), 'locales', code + '.json')
    def run_check(self, required=REQ): return K.check(self.root, required=required)
    def one_error(self, needle, required=REQ):
        r = self.run_check(required)
        self.assertEqual(len(r['errors']), 1, r['errors']); self.assertIn(needle, r['errors'][0]); return r

class Clean(Fix):
    def test_valid_fixture_has_no_finding(self):
        r = self.run_check()
        self.assertEqual(r['errors'], []); self.assertEqual(r['warnings'], [])
        self.assertEqual(r['coverage'], {'en': 100.0, 'pl': 100.0})

class Code(Fix):
    def test_non_literal_key(self): self.add_js('const g = hgT(k);'); self.one_error('non-literal')
    def test_non_literal_key_concatenation(self): self.add_js("const g = hgTLazy('demo.' + k);"); self.one_error('non-literal')
    def test_undeclared_dynamic_prefix(self): self.add_js("const g = hgTD('demo.' + k, k);"); self.one_error('dynamic prefix')
    def test_used_key_missing_from_en(self): self.add_js("const g = hgT('demo.nope');"); self.one_error('demo.nope')
    def test_hgTO_key_missing_from_en(self): self.add_js("const g = hgTO({}, { a: 'demo.nope2' });"); self.one_error('demo.nope2')
    def test_unused_en_key(self):
        en, pl = self.cat('en'), self.cat('pl'); en['demo']['unused'] = 'Unused'; pl['demo']['unused'] = 'Nieużywany'; self.put('en', en); self.put('pl', pl)
        self.one_error('demo.unused')
    def test_unused_dynamic_key_is_fine(self):
        en, pl = self.cat('en'), self.cat('pl'); en['states']['docked'] = 'docked'; pl['states']['docked'] = 'w stacji'; self.put('en', en); self.put('pl', pl)
        self.assertEqual(self.run_check()['errors'], [])
    def test_hardcoded_aria_label(self): self.add_js('const g = `<button aria-label="Close the panel"></button>`;'); self.one_error('Close the panel')
    def test_hardcoded_title_attr(self): self.add_js('const g = `<div title="Open settings"></div>`;'); self.one_error('Open settings')
    def test_hardcoded_placeholder(self): self.add_js('const g = `<input placeholder="Search entities">`;'); self.one_error('Search entities')
    def test_hardcoded_text_between_tags(self): self.add_js('const g = `<b>No devices found</b>`;'); self.one_error('No devices found')
    def test_hardcoded_dom_property(self): self.add_js("el.textContent = 'Saved successfully';"); self.one_error('Saved successfully')
    def test_hardcoded_polish(self): self.add_js("const g = 'Zapisz zmiany';"); self.one_error('Zapisz zmiany')
    def test_allowlisted_literal_is_fine(self):
        self.add_js('const g = `<span title="Home Assistant">Nuvio</span>`;'); self.assertEqual(self.run_check()['errors'], [])
    def test_allowlist_is_per_file(self):
        self.add_js("const g = ['mot', 'Ruch i obecność'];"); self.one_error('Ruch i obecność')   # allowed in areas.part.js only
        os.rename(self.p('parts', 'hg-demo.part.js'), self.p('parts', 'areas.part.js')); self.assertEqual(self.run_check()['errors'], [])
    def test_text_in_comment_is_fine(self):
        self.add_js("/* <b>No devices found</b> hgTr('a', 'b') hgCurLang() === 'pl' */"); self.assertEqual(self.run_check()['errors'], [])
    def test_reintroduced_hgTr(self): self.add_js("const g = hgTr('Tak', 'Yes');"); self.one_error('hgTr')
    def test_reintroduced_hgTrLazy(self): self.add_js("const g = hgTrLazy('Tak', 'Yes');"); self.one_error('hgTrLazy')
    def test_reintroduced_lang_choice(self): self.add_js("const g = hgCurLang() === 'pl' ? x : y;"); self.one_error("hgCurLang() === 'pl'")
    def test_runtime_file_is_skipped(self): self.assertEqual(self.run_check()['errors'], [])

class Catalogs(Fix):
    def test_invalid_json(self): self.wr('{ "_meta": ', 'locales', 'pl.json'); self.one_error('pl.json')
    def test_duplicate_key(self):
        self.wr(self.rd('locales', 'pl.json').replace('"title": "Demo",', '"title": "Demo",\n    "title": "Demo2",', 1), 'locales', 'pl.json')
        self.one_error('duplicate')
    def test_meta_incomplete(self):
        pl = self.cat('pl'); del pl['_meta']['locale']; self.put('pl', pl); self.one_error('_meta')
    def test_variable_missing(self):
        pl = self.cat('pl'); pl['demo']['greet'] = 'Witaj!'; self.put('pl', pl); self.one_error('{name}')
    def test_variable_unknown(self):
        pl = self.cat('pl'); pl['demo']['greet'] = 'Witaj, {name} {x}!'; self.put('pl', pl); self.one_error('{x}')
    def test_plural_form_missing(self):
        pl = self.cat('pl'); del pl['demo']['count_few']; self.put('pl', pl); self.one_error('few')
    def test_plural_expected_but_plain(self):
        pl = self.cat('pl'); [pl['demo'].pop(k) for k in list(pl['demo']) if k.startswith('count_')]; pl['demo']['count'] = '{count} el.'; self.put('pl', pl)
        self.one_error('demo.count')
    def test_count_in_plain_en_string_needs_plural_forms(self):
        en, pl = self.cat('en'), self.cat('pl'); en['demo']['title'] = '{count} demos'; pl['demo']['title'] = '{count} dema'; self.put('en', en); self.put('pl', pl)
        self.one_error('demo.title')
    def test_one_form_may_omit_count(self):
        pl = self.cat('pl'); pl['demo']['count_one'] = 'jeden element'; self.put('pl', pl); self.assertEqual(self.run_check()['errors'], [])
    def test_required_language_incomplete(self):
        pl = self.cat('pl'); del pl['demo']['title']; self.put('pl', pl)
        r = self.one_error('demo.title'); self.assertLess(r['coverage']['pl'], 100)
    def test_obsolete_key_in_required_language(self):
        pl = self.cat('pl'); pl['demo']['old'] = 'Stary'; self.put('pl', pl); self.one_error('demo.old')
    def test_required_language_file_missing(self): os.remove(self.p('locales', 'pl.json')); self.one_error('pl')
    def test_optional_language_partial_is_a_warning(self):
        self.put('de', {'_meta': {'name': 'Deutsch', 'locale': 'de-DE'}, 'common': {'save': 'Speichern'}})
        r = self.run_check(); self.assertEqual(r['errors'], [])
        self.assertEqual(len(r['warnings']), 1); self.assertIn('de', r['warnings'][0]); self.assertIn('%', r['warnings'][0])
        self.assertEqual(r['coverage']['de'], round(100 * 1 / 9, 1))
    def test_optional_language_still_checked_for_variables(self):
        self.put('de', {'_meta': {'name': 'Deutsch', 'locale': 'de-DE'}, 'demo': {'greet': 'Hallo!'}})
        self.one_error('{name}')

class Cli(Fix):
    def cli(self, *a):
        return subprocess.run([sys.executable, os.path.join(TOOLS, 'i18n_check.py'), '--root', self.root, *a], capture_output=True, text=True)
    def test_exit_code(self):
        self.assertEqual(self.cli().returncode, 0); self.add_js('const g = hgT(k);'); self.assertEqual(self.cli().returncode, 1)
    def test_json(self):
        r = self.cli('--json'); d = json.loads(r.stdout); self.assertEqual(set(d), {'errors', 'warnings', 'coverage'})
    def test_lang_lists_missing_and_obsolete(self):
        self.put('de', {'_meta': {'name': 'Deutsch', 'locale': 'de-DE'}, 'common': {'save': 'Speichern'}, 'demo': {'gone': 'Weg'}})
        out = self.cli('--lang', 'de').stdout
        self.assertIn('missing', out); self.assertIn('demo.title', out); self.assertIn('demo.count', out)
        self.assertIn('obsolete', out); self.assertIn('demo.gone', out); self.assertNotIn('common.save', out)

class RealSources(unittest.TestCase):
    def test_src_is_clean(self):
        r = K.check(os.path.join(HERE, '..', '..'))
        self.assertEqual(r['errors'], [])

if __name__ == '__main__': unittest.main()
