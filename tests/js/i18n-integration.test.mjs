/* Task 4: language from the manifest, waiting for the catalog (HGLang.set, strategy, standalone cards), card rerender, HG_LOC, hgTr gateway */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadParts, fixture } from './harness.mjs';

const EN = fixture('en'), PL = fixture('pl');
const meta = (c) => JSON.parse(readFileSync(new URL('../../src/locales/' + c + '.json', import.meta.url), 'utf8'))._meta;
/* manifest as tools/build.py builds it from src/locales (en first, then the others sorted), plus a fake fr for the generic paths */
const MAN = [{ code: 'en', name: meta('en').name, locale: meta('en').locale, file: null }, { code: 'pl', name: meta('pl').name, locale: meta('pl').locale, file: 'nuvio-locale-pl.aaaa.json' }];
const MAN_FR = [...MAN, { code: 'fr', name: 'Français', locale: 'fr-FR', file: 'nuvio-locale-fr.aaaa.json' }];
const FILES = ['hg-i18n.part.js', 'hg-select.part.js', 'hg-oss.part.js', 'hg-core.part.js'];
const NAMES = ['HGI18n', 'HGLang', 'HGStrategy', 'HGBase', 'hgLang', 'hgCurLang', 'hgTr', 'HG_LOC', 'HG_LIVE'];
const tick = (n = 5) => new Promise((r) => { const s = () => (n-- ? setImmediate(s) : r()); s(); });
const stub = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.iterator ? function* () {} : k === 'length' ? 0 : k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : stub()), apply: () => stub(), construct: () => stub() });
/* deferred fetch: each call waits until release() */
function deferred(cat = PL) {
  const calls = []; let rel; const gate = new Promise((r) => { rel = r; });
  const fetch = (u) => { calls.push(u); return gate.then(() => ({ ok: true, json: () => Promise.resolve(cat) })); };
  return { fetch, calls, release: () => rel() };
}
function mk({ lang = null, nav = ['en-GB'], fetch = deferred().fetch, manifest = MAN, parts = [], names = [], globals = {} } = {}) {
  const store = {}; if (lang) store['home-glass:lang'] = lang;
  const events = [], window = new EventTarget();   /* events: only hg-lang (hg-perf etc. are not under test) */
  const disp = window.dispatchEvent.bind(window); window.dispatchEvent = (e) => { if (e.type === 'hg-lang') events.push(e.type); return disp(e); };
  class El { constructor() { this.isConnected = false; } attachShadow() { return (this.shadowRoot = { addEventListener() {}, appendChild() {}, querySelectorAll: () => [] }); } dispatchEvent() {} }
  const g = { window, document: stub(), navigator: { languages: nav, language: nav[0] }, location: { pathname: '/nuvio/x', search: '' },
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    HTMLElement: El, customElements: { get() {}, define() {} }, matchMedia: stub(), requestAnimationFrame: () => 0, setInterval: () => 0, MutationObserver: class { observe() {} },
    CustomEvent, Event, fetch, getComputedStyle: stub(), ...globals };
  const api = loadParts([...FILES, ...parts], g, [...NAMES, ...names], { EN, MANIFEST: manifest, text: [['import.meta.url', 'undefined']] });
  return { ...api, events, window, store };
}

test('HG_LOC from the manifest locale: pl-PL / en-GB (and any manifest language)', () => {
  assert.equal(mk({ lang: 'pl' }).HG_LOC(), 'pl-PL');
  assert.equal(mk({ lang: 'en' }).HG_LOC(), 'en-GB');
  assert.equal(mk({ lang: 'fr', manifest: MAN_FR }).HG_LOC(), 'fr-FR');
});

test('HGLang.LIST is the manifest list (getter), ok() follows it', () => {
  const m = mk({ manifest: MAN_FR });
  assert.deepEqual(m.HGLang.LIST, m.HGI18n.list());
  assert.deepEqual(m.HGLang.LIST.map((x) => x[0]), ['en', 'pl', 'fr']);
  assert.equal(m.HGLang.ok('fr'), true); assert.equal(m.HGLang.ok('de'), false);
});

test('hgTr gateway: pl -> first, any other language -> second, whatever the LIST order; objects and arrays', () => {
  assert.equal(mk({ lang: 'pl' }).hgTr('a', 'b'), 'a');
  assert.equal(mk({ lang: 'en' }).hgTr('a', 'b'), 'b');
  const fr = mk({ lang: 'fr', manifest: MAN_FR }); assert.equal(fr.hgTr('a', 'b'), 'b');
  const rev = mk({ lang: 'pl', manifest: [MAN[1], MAN[0]] }); assert.deepEqual(rev.HGLang.LIST.map((x) => x[0]), ['pl', 'en']); assert.equal(rev.hgTr('a', 'b'), 'a');
  const pl = mk({ lang: 'pl' }); assert.deepEqual(pl.hgTr(['x'], ['y']), ['x']); assert.deepEqual(pl.hgTr({ k: 1 }, { k: 2 }), { k: 1 });
  assert.deepEqual(mk({ lang: 'en' }).hgTr({ k: 1 }, { k: 2 }), { k: 2 });
});

test('hgLang: personal choice first, then generic browser detection (navigator.languages)', () => {
  const m = mk({ nav: ['de-DE', 'fr-CA'], manifest: MAN_FR });
  assert.equal(m.hgLang(null, ''), 'fr'); assert.equal(m.hgLang(null, 'pl'), 'pl'); assert.equal(m.hgLang(null, 'gone'), 'fr');
  assert.equal(mk({ nav: ['de-DE'] }).hgLang(null, null), 'en');
});

test('HGLang.set waits for the catalog, then refresh (hg-lang) with the catalog active', async () => {
  const d = deferred(), m = mk({ fetch: d.fetch });
  const p = m.HGLang.set(null, 'pl');
  await tick();
  assert.equal(m.HGLang.get(), 'pl'); assert.deepEqual(m.events, [], 'no hg-lang before the catalog arrives'); assert.equal(d.calls.length, 1);
  d.release(); await p; await tick();
  assert.deepEqual(m.events, ['hg-lang']); assert.equal(m.HGI18n.code, 'pl');
  /* back to English: nothing to fetch, refresh right away (after a microtask) */
  await m.HGLang.set(null, 'en'); assert.equal(m.HGI18n.code, 'en'); assert.equal(m.events.filter((x) => x === 'hg-lang').length, 2);
});

test('HGStrategy.generate waits for HGI18n.ready(lang) before handing over (generation ends after the catalog)', async () => {
  const d = deferred(), m = mk({ fetch: d.fetch });
  let done = false, codeAtEnd = null;
  const hass = { states: {}, areas: {}, devices: {}, entities: {}, user: { id: 'u', is_admin: true }, callWS: () => Promise.reject(new Error('no ws')) };
  const p = m.HGStrategy.generate({ _wiz: { lang: 'pl', views: ['dashboard'] } }, hass).then((c) => { done = true; codeAtEnd = m.HGI18n.code; return c; }, (e) => { done = true; codeAtEnd = m.HGI18n.code; throw e; });
  await tick(20);
  assert.equal(done, false, 'generation must wait for the pl catalog'); assert.equal(d.calls.length, 1);
  d.release(); const cfg = await p;
  assert.equal(codeAtEnd, 'pl'); assert.ok(cfg && Array.isArray(cfg.views));
});

test('HGBase: one hg-lang listener rerenders the connected instances, marks the detached ones, purges dead refs', async () => {
  const m = mk({ lang: 'en' });
  let n = 0; class C extends m.HGBase { render() { n++; return '<b>' + n + '</b>'; } }
  const a = new C(), b = new C();
  for (const c of [a, b]) { c._config = {}; c._hass = { states: {} }; c.$ = { innerHTML: '' }; c._html = 'old'; }
  a.isConnected = true; b.isConnected = false;
  const dead = { deref: () => undefined }; m.HG_LIVE.add(dead); assert.equal(m.HG_LIVE.size, 3);
  m.window.dispatchEvent(new CustomEvent('hg-lang')); await tick();
  assert.equal(m.HG_LIVE.has(dead), false); assert.equal(m.HG_LIVE.size, 2);
  assert.equal(n, 1, 'only the connected card rerenders'); assert.equal(a._html, '<b>1</b>'); assert.equal(b._stale, true);
});

test('standalone card (no strategy): first render triggers the catalog, its arrival rerenders the card without reload', async () => {
  const d = deferred(), m = mk({ lang: 'pl', fetch: d.fetch });
  let n = 0; class C extends m.HGBase { render() { n++; return '<b>' + n + ' ' + m.HGI18n.code + '</b>'; } }
  const c = new C(); c.isConnected = true; c.$ = { innerHTML: '' }; c._config = {}; c.hass = { states: {} };
  assert.equal(n, 1); assert.equal(c.$.innerHTML, '<b>1 en</b>'); assert.equal(d.calls.length, 1);
  await tick(); assert.deepEqual(m.events, []);
  d.release(); await tick(10);
  assert.deepEqual(m.events, ['hg-lang']); assert.equal(m.HGI18n.code, 'pl'); assert.equal(n, 2); assert.equal(c._html, '<b>2 pl</b>');
  /* once loaded: no further fetch nor event */
  c.rerender(); await tick(); assert.equal(d.calls.length, 1); assert.deepEqual(m.events, ['hg-lang']);
});

test('hgAgoRel formats with HG_LOC()', () => {
  const m = mk({ lang: 'fr', manifest: MAN_FR, parts: ['cards/logbook-card.part.js'], names: ['hgAgoRel'] });
  assert.equal(m.hgAgoRel(Date.now() - 2 * 3600e3), new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' }).format(-2, 'hour'));
  assert.equal(mk({ lang: 'pl', parts: ['cards/logbook-card.part.js'], names: ['hgAgoRel'] }).hgAgoRel(Date.now() - 5 * 60e3), '5 minut temu');
});

test('edit mode: language switch repaints the edit bar, Look sheet and cards only once the catalog is active', async () => {
  const d = deferred(), m = mk({ fetch: d.fetch, parts: ['hg-edit.part.js'], names: ['HG_EDIT'], globals: { HGPage: class {}, HG_TOGGLE_DOM: stub(), HG_FLOW_RX: stub() } });
  const seen = [], page = { _editing: true, _hass: null };
  for (const f of ['_eBar', '_eLook', '_eRefresh', '_eToast']) page[f] = () => { seen.push(f + ':' + m.HGI18n.code); };
  const p = m.HG_EDIT._eCtl.call(page, { dataset: { hge: 'lang', l: 'pl' } });
  await tick(10);
  assert.deepEqual(seen, [], 'nothing repainted before the catalog'); assert.equal(m.HGLang.get(), 'pl');
  d.release(); await p; await tick();
  assert.ok(seen.length >= 3 && seen.every((s) => s.endsWith(':pl')), seen.join(','));
  assert.ok(['_eBar:pl', '_eLook:pl', '_eRefresh:pl', '_eToast:pl'].every((s) => seen.includes(s)), seen.join(','));
});

test('hgReg: customCards name / description are enumerable getters resolved at read time (lazy values, R10)', () => {
  const m = mk({ lang: 'en', names: ['hgReg', 'hgTLazy'] });
  class C extends m.HGBase {}
  let lab = 'A'; m.hgReg('hg-x-card', C, { toString: () => lab }, { toString: () => 'D' + lab });
  const e = m.window.customCards.find((c) => c.type === 'hg-x-card');
  assert.equal(e.name, 'A'); assert.equal(e.description, 'DA');
  lab = 'B'; assert.equal(e.name, 'B'); assert.equal(e.description, 'DB'); assert.equal(typeof e.name, 'string');
  assert.deepEqual(Object.keys(e), ['type', 'name', 'description', 'preview']);
  assert.deepEqual(JSON.parse(JSON.stringify(e)), { type: 'hg-x-card', name: 'B', description: 'DB', preview: false });
  /* hgTLazy: the catalog index resolves in the language active when HA reads the list */
  m.hgReg('hg-y-card', class extends m.HGBase {}, m.hgTLazy(0), 'plain');
  const y = m.window.customCards.find((c) => c.type === 'hg-y-card');
  assert.equal(y.name, 'Save'); m.HGI18n.cache.pl = PL; m.HGI18n.code = 'pl'; assert.equal(y.name, 'Zapisz'); assert.equal(y.description, 'plain');
  /* plain strings and a missing description as before; one entry per tag */
  m.hgReg('hg-z-card', class extends m.HGBase {}, 'Z'); const z = m.window.customCards.find((c) => c.type === 'hg-z-card');
  assert.equal(z.name, 'Z'); assert.equal(z.description, undefined);
  m.hgReg('hg-x-card', C, 'again', 'again'); assert.equal(m.window.customCards.filter((c) => c.type === 'hg-x-card').length, 1);
});

test('setup wizard languages come from the manifest (flag / intro from _meta), English last; a new language appears by itself', () => {
  const man = [{ code: 'en', name: 'English', locale: 'en-GB', file: null, flag: '🇬🇧', intro: 'English interface' }, { code: 'pl', name: 'Polski', locale: 'pl-PL', file: 'p.json', flag: '🇵🇱', intro: 'Interfejs po polsku' }];
  const m = mk({ manifest: man, names: ['hgWzLangs', 'hgLangName'] });
  assert.deepEqual(m.hgWzLangs(), [['pl', 'Polski', '🇵🇱', 'Interfejs po polsku'], ['en', 'English', '🇬🇧', 'English interface']]);
  assert.equal(m.hgLangName('pl'), 'Polski'); assert.equal(m.hgLangName('en'), 'English');
  const f = mk({ manifest: [...man, { code: 'fr', name: 'Français', locale: 'fr-FR', file: 'f.json' }], names: ['hgWzLangs'] });
  assert.deepEqual(f.hgWzLangs().map((x) => x[0]), ['pl', 'fr', 'en']); assert.deepEqual(f.hgWzLangs()[1], ['fr', 'Français', '🌐', 'Français']);
});

test('H.t: binary_sensor fallback by device_class comes from the catalog (states.binary.<dc>.on|off), any language', () => {
  const m = mk({ lang: 'pl', names: ['H'] });
  m.HGI18n.cache.pl = { m: { name: 'Polski', locale: 'pl' }, t: [], d: { 'states.binary.door.on': 'otwarte', 'states.binary.door.off': 'zamknięte' } }; m.HGI18n.code = 'pl';
  const so = (s, dc) => ({ entity_id: 'binary_sensor.x', state: s, attributes: { device_class: dc } });
  assert.equal(m.H.t({}, so('on', 'door')), 'otwarte'); assert.equal(m.H.t({}, so('off', 'door')), 'zamknięte');
  /* HA translation wins; unknown device_class falls through to the states dictionary / raw state */
  assert.equal(m.H.t({ formatEntityState: () => 'Otwarte' }, so('on', 'door')), 'otwarte');
  assert.equal(m.H.t({}, so('on', 'nope')), 'on');
  /* another language without the entry: English catalog text, then the raw state */
  const f = mk({ lang: 'fr', manifest: MAN_FR, names: ['H'] }); f.HGI18n.cache.fr = { m: { name: 'Français', locale: 'fr-FR' }, t: [], d: {} }; f.HGI18n.code = 'fr';
  assert.equal(f.H.t({}, so('on', 'door')), 'on');
});
