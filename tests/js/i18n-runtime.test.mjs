import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { loadParts, fixture } from './harness.mjs';

const EN = fixture('en'), PL = fixture('pl'), XX = fixture('xx');
const MAN = [{ code: 'en', name: 'English', locale: 'en', file: null }, { code: 'pl', name: 'Polski', locale: 'pl', file: 'nuvio-locale-pl.aaaa.json' },
  { code: 'fr', name: 'Français', locale: 'fr-FR', file: 'nuvio-locale-fr.aaaa.json' }, { code: 'pt', name: 'Português', locale: 'pt-PT', file: 'nuvio-locale-pt.aaaa.json' },
  { code: 'xx', name: 'Partial', locale: 'xx', file: 'nuvio-locale-xx.aaaa.json' }];
const ok = (j) => Promise.resolve({ ok: true, json: () => Promise.resolve(j) });
function mk({ fetch = () => ok(PL), manifest = MAN, window: w = {} } = {}) {
  const events = [], calls = [];
  const window = Object.assign({ dispatchEvent: (e) => events.push(e.type) }, w);
  const f = (u) => { calls.push(u); return fetch(u); };
  const api = loadParts(['hg-i18n.part.js'], { window, navigator: {}, localStorage: {}, fetch: f, HG_ASSET: 'http://x/', CustomEvent: class { constructor(t) { this.type = t; } } },
    ['HGI18n', 'hgT', 'hgTLazy', 'hgTD', 'hgTO', 'hgLangDetect'], { EN, MANIFEST: manifest });
  return { ...api, events, calls, window };
}
const use = (m, code, cat) => { m.HGI18n.cache[code] = cat; m.HGI18n.code = code; };

test('hgT basic in en and pl', () => {
  const m = mk(); assert.equal(m.hgT(0), 'Save'); use(m, 'pl', PL); assert.equal(m.hgT(0), 'Zapisz');
});
test('variables, missing = empty', () => {
  const m = mk(); use(m, 'pl', PL);
  assert.equal(m.hgT(1, { name: 'Ana' }), 'Witaj, Ana!'); assert.equal(m.hgT(1, {}), 'Witaj, !'); assert.equal(m.hgT(1), 'Witaj, !');
});
test('PL plural forms', () => {
  const m = mk(); use(m, 'pl', PL);
  for (const [c, w] of [[1, 'encja'], [3, 'encje'], [5, 'encji'], [1.5, 'encji']]) assert.equal(m.hgT(2, { count: c }), c + ' ' + w);
});
test('partial catalog falls back to English', () => {
  const m = mk(); use(m, 'xx', XX);
  assert.equal(m.hgT(0), 'Save'); assert.equal(m.hgT(1, { name: 'A' }), 'Welcome, A!');
  assert.equal(m.hgT(2, { count: 3 }), '3 entities'); // "other" lacks {count} -> English
  assert.equal(m.hgT(2, { count: 1 }), '1 entity'); // English one form
});
test('translation form missing -> English', () => {
  const m = mk(); use(m, 'xx', { m: { locale: 'en' }, t: [null, null, { other: '{count} x' }], d: {} });
  assert.equal(m.hgT(2, { count: 1 }), '1 entity'); assert.equal(m.hgT(2, { count: 4 }), '4 x');
});
test('unknown keys', () => {
  const m = mk(); assert.equal(m.hgT(99), '#99'); assert.equal(m.hgT('nope.key'), 'nope.key');
});
test('hgT returns key when HG_I18N_EN is null', () => {
  const api = loadParts(['hg-i18n.part.js'], { window: {}, fetch() {}, HG_ASSET: '', CustomEvent: class {} }, ['hgT']);
  assert.equal(api.hgT('a.b'), 'a.b'); assert.equal(api.hgT(3), '#3');
});
test('hgTLazy resolves at use time', () => {
  const m = mk(); const l = m.hgTLazy(0); assert.equal(`${l}`, 'Save'); use(m, 'pl', PL); assert.equal(String(l), 'Zapisz'); assert.equal(JSON.stringify({ a: l }), '{"a":"Zapisz"}');
});
test('hgTD dynamic', () => {
  const m = mk(); assert.equal(m.hgTD('states.docked', 'x'), 'docked'); use(m, 'pl', PL);
  assert.equal(m.hgTD('states.docked', 'docked'), 'w stacji'); assert.equal(m.hgTD('states.zzz', 'zzz'), 'zzz');
});
test('hgTO getters', () => {
  const m = mk(); const o = m.hgTO({ id: 1 }, { label: 0 }); assert.equal(o.label, 'Save'); use(m, 'pl', PL); assert.equal(o.label, 'Zapisz'); assert.equal(o.id, 1);
});
test('hgLangDetect', () => {
  const m = mk(); assert.equal(m.hgLangDetect(null, ['fr-FR', 'en']), 'fr');
  assert.equal(m.hgLangDetect(null, ['pt-BR']), 'pt'); assert.equal(m.hgLangDetect(null, ['de']), 'en'); assert.equal(m.hgLangDetect('gone', ['pl']), 'pl');
  assert.equal(m.hgLangDetect('fr', ['pl']), 'fr'); assert.equal(m.hgLangDetect(undefined, []), 'en');
  const m2 = mk({ manifest: [...MAN, { code: 'pt-br', name: 'PT-BR', locale: 'pt-BR', file: 'nuvio-locale-p.json' }] }); assert.equal(m2.hgLangDetect(null, ['pt-BR']), 'pt-br');
  assert.equal(mk({ manifest: [] }).hgLangDetect(null, ['fr']), 'en');
});
test('has / locale / list', () => {
  const m = mk(); assert.ok(m.HGI18n.has('fr')); assert.ok(!m.HGI18n.has('zz')); assert.equal(m.HGI18n.locale('fr'), 'fr-FR'); assert.equal(m.HGI18n.list()[1][0], 'pl');
});
test('load: success caches, en needs no fetch', async () => {
  const m = mk(); assert.equal(await m.HGI18n.load('en'), true); assert.equal(m.calls.length, 0);
  assert.equal(await m.HGI18n.load('pl'), true); assert.equal(await m.HGI18n.load('pl'), true); assert.deepEqual(m.calls, ['http://x/nuvio-locale-pl.aaaa.json']);
});
test('load: failure remembered, warns once', async () => {
  const w = mock.method(console, 'warn', () => {});
  const m = mk({ fetch: () => Promise.reject(new Error('off')) });
  assert.equal(await m.HGI18n.load('fr'), false); assert.equal(await m.HGI18n.load('fr'), false); assert.equal(m.calls.length, 1); assert.equal(w.mock.callCount(), 1); w.mock.restore();
});
test('load: invalid JSON / HTTP 404 / unknown code', async () => {
  const w = mock.method(console, 'warn', () => {});
  const a = mk({ fetch: () => Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError('bad')) }) }); assert.equal(await a.HGI18n.load('fr'), false);
  const b = mk({ fetch: () => Promise.resolve({ ok: false, status: 404, json: () => ok({}) }) }); assert.equal(await b.HGI18n.load('fr'), false);
  const c = mk(); assert.equal(await c.HGI18n.load('zz'), false); assert.equal(c.calls.length, 0); w.mock.restore();
});
test('ready: failure resolves fast, stays English', async () => {
  const w = mock.method(console, 'warn', () => {}); const m = mk({ fetch: () => Promise.reject(new Error('off')) });
  const t = Date.now(); await m.HGI18n.ready('fr'); assert.ok(Date.now() - t < 50); assert.equal(m.HGI18n.code, 'en'); w.mock.restore();
});
test('ready: success sets code, no event', async () => {
  const m = mk(); await m.HGI18n.ready('pl'); assert.equal(m.HGI18n.code, 'pl'); assert.equal(m.hgT(0), 'Zapisz'); assert.deepEqual(m.events, []);
});
test('ready: timeout then hg-lang when catalog arrives', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    let res; const m = mk({ fetch: () => new Promise((r) => { res = r; }) }); let done = false;
    const p = m.HGI18n.ready('pl').then(() => { done = true; });
    await Promise.resolve(); mock.timers.tick(2999); await Promise.resolve(); assert.equal(done, false);
    mock.timers.tick(1); await p; assert.equal(done, true); assert.equal(m.HGI18n.code, 'en'); assert.deepEqual(m.events, []);
    res({ ok: true, json: () => Promise.resolve(PL) }); await new Promise((r) => setImmediate(r));
    assert.equal(m.HGI18n.code, 'pl'); assert.deepEqual(m.events, ['hg-lang']); assert.equal(m.hgT(0), 'Zapisz');
  } finally { mock.timers.reset(); }
});
test('preload reused only when code and file match manifest', async () => {
  const pre = { code: 'fr', file: 'nuvio-locale-fr.aaaa.json', p: Promise.resolve(PL) };
  const a = mk({ window: { __hgI18nPre: pre } }); assert.equal(await a.HGI18n.load('fr'), true); assert.equal(a.calls.length, 0);
  const man = MAN.map((x) => (x.code === 'fr' ? { ...x, file: 'nuvio-locale-fr.bbbb.json' } : x));
  const b = mk({ window: { __hgI18nPre: pre }, manifest: man }); assert.equal(await b.HGI18n.load('fr'), true); assert.deepEqual(b.calls, ['http://x/nuvio-locale-fr.bbbb.json']);
});
