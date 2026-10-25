/* Telewizor: obiekt strony HGTv (render, pola trzymane w obiekcie, parowanie z tokenem, ukryty formularz, odpytywanie ze sterowanym zegarem, lista i usuwanie). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadParts } from './harness.mjs';

const ID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const OLD = 'f0e1d2c3b4a5968778695a4b3c2d1e0f';
const SECRET = 'SYNTHETIC-SIGNATURE-TOKEN';
const JWT = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ iss: ID })).toString('base64url'), SECRET].join('.');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const tick = () => new Promise((r) => setImmediate(r));
const row = (o) => ({ id: OLD, type: 'long_lived_access_token', client_name: 'Nuvio TV 2026-10-24 20:00', created_at: '2026-10-24T19:00:00.000000+00:00', is_current: false, ...o });
const SESSION = row({ id: 'cur', type: 'normal', client_name: 'Nuvio TV sesja', is_current: true });

/* minimalny document: ukryty formularz w pamięci, submit zapisuje wysłane pola (brak biblioteki DOM w tests/js) */
function fakeDocument() {
  const sent = [], atSubmit = [];
  const mk = (tag) => ({ tag, attrs: {}, children: [], parent: null,
    setAttribute(k, v) { this.attrs[k] = String(v); }, appendChild(c) { c.parent = this; this.children.push(c); return c; },
    remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); this.parent = null; },
    submit() { atSubmit.push(body.innerHTML); sent.push({ action: this.attrs.action, method: this.attrs.method, target: this.attrs.target, rel: this.attrs.rel, fields: Object.fromEntries(this.children.map((c) => [c.attrs.name, c.attrs.value])) }); } });
  const body = mk('body');
  const ser = (n) => ({ tag: n.tag, attrs: n.attrs, children: n.children.map(ser) });
  Object.defineProperty(body, 'innerHTML', { get() { return JSON.stringify(this.children.map(ser)); } });
  return { sent, atSubmit, document: { createElement: mk, body } };
}

function env(o = {}) {
  const log = { ws: [], toasts: [], looks: 0, alerts: [], hgt: [], seenPolls: 0, order: [], opens: [] };
  const fd = fakeDocument();
  const st = { tokens: [row(), SESSION], marker: {}, seenAfter: Infinity, createResult: JWT, confirm: true, createFails: false, ...o };
  /* karta TV: window.open('', nazwa) daje uchwyt albo null (zablokowana) albo wyjątek; kolejność wywołań w log.order */
  const tab = { opener: 'dashboard', closed: false, close() { this.closed = true; } };
  const openFn = (url, name) => { log.order.push('open'); log.opens.push([url, name]); if (o.openThrows) throw new Error('blocked'); return o.blocked ? null : tab; };
  const hass = { callWS: async (msg) => {
    log.ws.push(msg); log.order.push('ws:' + msg.type);
    switch (msg.type) {
      case 'auth/refresh_tokens': return st.tokens;
      case 'auth/long_lived_access_token':
        if (st.createFails) throw { code: 'unknown_error' };
        st.tokens = [...st.tokens, row({ id: ID, client_name: msg.client_name, created_at: '2026-10-25T13:30:00.000000+00:00' })];
        return st.createResult;
      case 'frontend/get_user_data': log.seenPolls++; return { value: log.seenPolls >= st.seenAfter ? { ...st.marker, [ID]: '2026-10-25T13:31:00.000Z' } : st.marker };
      case 'auth/delete_refresh_token': st.tokens = st.tokens.filter((t) => t.id !== msg.refresh_token_id); return {};
      default: throw new Error('unexpected ' + msg.type);
    }
  } };
  const fields = { 'tv-addr': { value: '' }, 'tv-code': { value: '' }, 'tv-ha': { value: '' } };
  const sheet = { querySelector: (sel) => (sel === '.lk' ? {} : fields[sel.slice(6, -1)] || null) };
  const p = { _hass: hass, _eSheetEl: sheet, _eToast: (t) => log.toasts.push(t), _eLook: () => { log.looks++; } };
  const globals = {
    window: { open: openFn, ...(o.window || {}) }, document: fd.document, location: { origin: 'https://ha.example.com' }, HG_LOC: () => 'en',
    H: { esc, icon: (i) => `<ha-icon icon="${i}"></ha-icon>` },
    hgT: (k, a) => { log.hgt.push([k, a]); return k + (a ? JSON.stringify(a) : ''); },
    hgOverlay: { alert: async (...a) => { log.alerts.push(a); return st.confirm; } },
    HTMLElement: class {}, customElements: { get: () => null, define() {} },
  };
  const { HGTv } = loadParts(['ui/form.part.js', 'hg-tvlogic.part.js', 'hg-tv.part.js'], globals, ['HGTv']);
  /* zegar sterowany z testu: sleep przesuwa czas; przy manualHold każde sleep(1000) (pętla hold) czeka, aż pump() je zwolni */
  let t = 0; const sleeps = [], holds = [];
  HGTv.clock = { now: () => t, sleep: async (ms) => { sleeps.push(ms); if (o.manualHold && ms === 1000) await new Promise((r) => holds.push(r)); t += ms; } };
  const pump = async (n) => { for (let i = 0; i < n; i++) { await tick(); const w = holds.shift(); if (w) w(); } await tick(); };
  HGTv.now = () => new Date(2026, 9, 25, 14, 30);
  const fill = (addr, code, ha = 'https://ha.example.com') => { fields['tv-addr'].value = addr; fields['tv-code'].value = code; fields['tv-ha'].value = ha; };
  const types = () => log.ws.map((m) => m.type);
  /* pierwszy render uruchamia wczytanie listy; po nim czyścimy dziennik wywołań i licznik odpytań */
  const open = async () => { HGTv.html(p); await tick(); await tick(); log.ws.length = 0; log.seenPolls = 0; log.order.length = 0; log.opens.length = 0; };
  return { HGTv, p, log, st, fd, fields, fill, sleeps, types, open, tab, pump };
}

test('html: sekcja strony tv z polami, przyciskiem i listą tokenów telewizorów (bez bieżącej sesji)', async () => {
  const { HGTv, p, log } = env({ marker: { [OLD]: '2026-10-25T12:50:00.000Z' } });
  assert.match(HGTv.html(p), /common\.loading/);
  await tick(); await tick();
  assert.equal(log.looks >= 1, true);
  const h = HGTv.html(p);
  assert.match(h, /<section class="lk-g tv" data-tab="tv" data-pg="tv"/);
  for (const n of ['tv-addr', 'tv-code', 'tv-ha']) assert.match(h, new RegExp('name="' + n + '"'));
  assert.match(h, /data-hge="tv-pair"/);
  assert.match(h, /Nuvio TV 2026-10-24 20:00/);
  assert.match(h, /data-hge="tv-del" data-id="f0e1d2c3b4a5968778695a4b3c2d1e0f"/);
  assert.match(h, /tv\.seen/);
  assert.doesNotMatch(h, /Nuvio TV sesja|tv\.not_seen/);
  assert.match(h, /value="https:\/\/ha\.example\.com"/);
});

test('html: lista bez wpisu znacznika pokazuje "jeszcze nie widziany", błąd odczytu daje ponowienie', async () => {
  const a = env();
  a.HGTv.html(a.p); await tick(); await tick();
  assert.match(a.HGTv.html(a.p), /tv\.not_seen/);
  const b = env(); b.p._hass.callWS = async () => { throw new Error('x'); };
  b.HGTv.html(b.p); await tick(); await tick();
  assert.match(b.HGTv.html(b.p), /data-hge="tv-reload"/);
  b.p._hass.callWS = async () => [];
  await b.HGTv.act(b.p, {}, 'tv-reload'); b.HGTv.html(b.p); await tick(); await tick();
  assert.match(b.HGTv.html(b.p), /tv\.list_empty/);
});

test('walidacja: błędne pola nie wywołują HA, wpisany tekst zostaje w obiekcie po przerysowaniu', async () => {
  const { HGTv, p, fill, log, open } = env();
  await open();
  fill('10.0.8.117', '12345', 'ha.local');
  await HGTv.act(p, {}, 'tv-pair');
  const h = HGTv.html(p);
  for (const k of ['tv\\.err_addr', 'tv\\.err_code', 'tv\\.err_ha']) assert.match(h, new RegExp(k));
  assert.match(h, /value="10\.0\.8\.117"/); assert.match(h, /value="12345"/); assert.match(h, /value="ha\.local"/);
  assert.deepEqual(log.ws, []); assert.deepEqual(log.opens, []);
});

test('walidacja: adres spoza sieci prywatnej blokuje wysyłkę', async () => {
  const { HGTv, p, fill, log, fd, open } = env();
  await open();
  fill('8.8.8.8:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.match(HGTv.html(p), /tv\.err_private/);
  assert.deepEqual(log.ws, []); assert.equal(fd.sent.length, 0); assert.deepEqual(log.opens, []);
});

test('parowanie: karta TV jest otwierana synchronicznie w kliknięciu, przed pierwszym wywołaniem HA, a formularz trafia w tę kartę', async () => {
  const { HGTv, p, fill, fd, log, tab, open } = env({ seenAfter: 1 });
  await open();
  fill('10.0.8.117:8798', '482913');
  const run = HGTv.act(p, {}, 'tv-pair');
  assert.deepEqual(log.opens, [['', 'nuvio-tv-pair']]);       /* już po synchronicznej części kliknięcia, przed jakimkolwiek await */
  assert.equal(log.order[0], 'open');
  assert.equal(tab.opener, null);
  await run;
  assert.deepEqual(log.opens, [['', 'nuvio-tv-pair']]);
  assert.equal(log.order.indexOf('open'), 0);
  assert.equal(log.order.findIndex((x) => x.startsWith('ws:')) > 0, true);
  assert.equal(fd.sent[0].target, log.opens[0][1]);
  assert.equal(fd.sent[0].rel, undefined);
  assert.equal(tab.closed, false);
  assert.equal(HGTv.status, 'done');
});

test('parowanie: gdy do wysyłki nie dojdzie, otwarta pusta karta jest zamykana, po przekroczeniu czasu zostaje', async () => {
  const a = env({ createFails: true }); await a.open(); a.fill('10.0.8.117:8798', '482913');
  await a.HGTv.act(a.p, {}, 'tv-pair');
  assert.equal(a.HGTv.status, 'err_create'); assert.equal(a.tab.closed, true);
  const b = env({ createResult: 'opaque-token' }); await b.open(); b.fill('10.0.8.117:8798', '482913');
  const ws = b.p._hass.callWS; b.p._hass.callWS = async (m) => (m.type === 'auth/refresh_tokens' && b.log.ws.some((x) => x.type === 'auth/long_lived_access_token') ? [] : ws(m));
  await b.HGTv.act(b.p, {}, 'tv-pair');
  assert.equal(b.HGTv.status, 'err_id'); assert.equal(b.tab.closed, true);
  const c = env(); await c.open(); c.fill('10.0.8.117:8798', '482913');
  c.fd.document.createElement = () => { throw new Error('blocked'); };
  await c.HGTv.act(c.p, {}, 'tv-pair');
  assert.equal(c.HGTv.status, 'err_send'); assert.equal(c.tab.closed, true);
  const d = env(); await d.open(); d.fill('10.0.8.117:8798', '482913');
  await d.HGTv.act(d.p, {}, 'tv-pair');
  assert.equal(d.HGTv.status, 'timeout'); assert.equal(d.tab.closed, false);
});

test('zablokowana karta: token powstaje, ale formularz wychodzi dopiero w drugim kliknięciu (target _blank, synchronicznie)', async () => {
  const { HGTv, p, fill, fd, log, types, tab, open, pump } = env({ blocked: true, manualHold: true, seenAfter: 1 });
  await open();
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.deepEqual(log.opens, [['', 'nuvio-tv-pair']]);
  assert.deepEqual(types(), ['auth/refresh_tokens', 'auth/long_lived_access_token']);
  assert.equal(HGTv.status, 'ready'); assert.equal(fd.sent.length, 0);
  const h = HGTv.html(p);
  assert.match(h, /tv\.ready/); assert.match(h, /data-hge="tv-send"/); assert.match(h, /data-hge="tv-pair" disabled/);
  assert.equal(h.includes(SECRET), false); assert.deepEqual(fd.document.body.children, []);
  await HGTv.act(p, {}, 'tv-pair');                                          /* ponowny Sparuj w trakcie nie tworzy drugiego tokenu */
  assert.equal(types().filter((t) => t === 'auth/long_lived_access_token').length, 1);
  const run = HGTv.act(p, {}, 'tv-send');
  assert.equal(fd.sent.length, 1);                                           /* formularz wyszedł synchronicznie, przed jakimkolwiek await */
  assert.deepEqual(fd.sent[0], { action: 'http://10.0.8.117:8798/pair', method: 'post', target: '_blank', rel: 'noopener', fields: { code: '482913', url: 'https://ha.example.com', token: JWT } });
  assert.equal(HGTv.ready, null);
  assert.equal(JSON.stringify(HGTv).includes(SECRET), false);
  await run;
  assert.equal(HGTv.status, 'done');
  await pump(2);                                                             /* pętla hold kończy się bez kasowania wysłanego tokenu */
  assert.equal(HGTv.status, 'done'); assert.equal(types().includes('auth/delete_refresh_token'), false);
  assert.deepEqual(fd.document.body.children, []);
  assert.equal(tab.closed, false);
  await HGTv.act(p, {}, 'tv-send');
  assert.equal(fd.sent.length, 1);                                           /* trzecie kliknięcie nic nie wysyła */
});

test('zablokowana karta: wyjątek z window.open jest traktowany jak blokada', async () => {
  const { HGTv, p, fill, fd, types, open } = env({ openThrows: true, manualHold: true });
  await open();
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(HGTv.status, 'ready'); assert.equal(fd.sent.length, 0);
  assert.equal(types().filter((t) => t === 'auth/long_lived_access_token').length, 1);
});

test('zablokowana karta: po 2 minutach niewysłany token jest usuwany z HA i z pamięci', async () => {
  const { HGTv, p, fill, fd, log, st, open, pump } = env({ blocked: true, manualHold: true });
  await open();
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  await pump(119);
  assert.equal(HGTv.status, 'ready');
  assert.deepEqual(log.ws.filter((m) => m.type === 'auth/delete_refresh_token'), []);
  await pump(2);
  assert.equal(HGTv.status, 'expired'); assert.equal(HGTv.ready, null);
  assert.deepEqual(log.ws.at(-1), { type: 'auth/delete_refresh_token', refresh_token_id: ID });
  assert.equal(st.tokens.some((t) => t.id === ID), false);
  const h = HGTv.html(p);
  assert.match(h, /tv\.expired/); assert.doesNotMatch(h, /data-hge="tv-send"/);
  assert.equal(JSON.stringify(HGTv).includes(SECRET), false);
  await HGTv.act(p, {}, 'tv-send');
  assert.equal(fd.sent.length, 0);
});

test('zablokowana karta: zamknięcie panelu kasuje niewysłany token', async () => {
  const { HGTv, p, fill, fd, log, open, pump } = env({ blocked: true, manualHold: true });
  await open();
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  p._eSheetEl = null;
  await pump(2);
  assert.equal(HGTv.status, 'idle'); assert.equal(HGTv.ready, null);
  assert.deepEqual(log.ws.at(-1), { type: 'auth/delete_refresh_token', refresh_token_id: ID });
  assert.equal(JSON.stringify(HGTv).includes(SECRET), false);
  assert.equal(fd.sent.length, 0);
});

test('zablokowana karta: ponowne otwarcie panelu kasuje niewysłany token', async () => {
  const { HGTv, p, fill, log, open } = env({ blocked: true, manualHold: true });
  await open();
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  p._eSheetEl = { querySelector: p._eSheetEl.querySelector };
  const h = HGTv.html(p);
  assert.equal(HGTv.ready, null); assert.equal(HGTv.status, 'idle');
  assert.deepEqual(log.ws.filter((m) => m.type === 'auth/delete_refresh_token'), [{ type: 'auth/delete_refresh_token', refresh_token_id: ID }]);
  assert.doesNotMatch(h, /data-hge="tv-send"/); assert.equal(h.includes(SECRET), false);
});

test('parowanie: unikalna nazwa, token, formularz POST, odpytywanie co 3 s i potwierdzenie znacznikiem', async () => {
  const { HGTv, p, fill, st, fd, sleeps, types, log, open } = env({ seenAfter: 3 });
  await open(); st.tokens = [row({ client_name: 'Nuvio TV 2026-10-25 14:30' })];
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.deepEqual(types().slice(0, 3), ['auth/refresh_tokens', 'auth/long_lived_access_token', 'frontend/get_user_data']);
  assert.deepEqual(log.ws[1], { type: 'auth/long_lived_access_token', client_name: 'Nuvio TV 2026-10-25 14:30 2', lifespan: 3650 });
  assert.equal(fd.sent.length, 1);
  assert.deepEqual(fd.sent[0], { action: 'http://10.0.8.117:8798/pair', method: 'post', target: 'nuvio-tv-pair', rel: undefined, fields: { code: '482913', url: 'https://ha.example.com', token: JWT } });
  assert.deepEqual(sleeps, [3000, 3000, 3000]);
  assert.deepEqual(log.ws.filter((m) => m.type === 'frontend/get_user_data'), Array(3).fill({ type: 'frontend/get_user_data', key: 'nuvio_tv_seen' }));
  assert.equal(HGTv.status, 'done');
  assert.equal(types().includes('auth/delete_refresh_token'), false);
  assert.match(HGTv.html(p), /tv\.connected/);
});

test('parowanie: link z QR wklejony w pole adresu rozdziela się na adres i kod', async () => {
  const { HGTv, p, fill, fd, open } = env({ seenAfter: 1 });
  await open();
  fill('http://10.0.8.117:8798/pair?c=482913', '');
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(fd.sent[0].action, 'http://10.0.8.117:8798/pair'); assert.equal(fd.sent[0].fields.code, '482913');
});

test('parowanie: po 60 s bez znacznika token jest usuwany (20 odpytań), komunikat o braku odpowiedzi', async () => {
  const { HGTv, p, fill, st, sleeps, log, open } = env();
  await open();
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(sleeps.length, 20);
  assert.equal(log.seenPolls, 20);
  assert.deepEqual(log.ws.at(-1), { type: 'auth/delete_refresh_token', refresh_token_id: ID });
  assert.equal(st.tokens.some((t) => t.id === ID), false);
  assert.equal(HGTv.status, 'timeout');
  assert.match(HGTv.html(p), /tv\.timeout/);
});

test('parowanie: błąd odczytu znacznika w trakcie nie przerywa, kolejne odpytanie może potwierdzić', async () => {
  const { HGTv, p, fill, open } = env({ seenAfter: 2 });
  await open();
  const ws = p._hass.callWS; let first = true;
  p._hass.callWS = async (m) => { if (m.type === 'frontend/get_user_data' && first) { first = false; throw new Error('x'); } return ws(m); };
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(HGTv.status, 'done');
});

test('parowanie: gdy JWT nie da się odczytać, id znajduje się po nazwie z auth/refresh_tokens', async () => {
  const { HGTv, p, fill, fd, types, open } = env({ createResult: 'opaque-token', seenAfter: 1 });
  await open();
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(types().filter((t) => t === 'auth/refresh_tokens').length, 2);
  assert.equal(fd.sent.length, 1); assert.equal(HGTv.status, 'done');
});

test('parowanie: gdy id nie da się ustalić, nic nie jest wysyłane', async () => {
  const { HGTv, p, fill, fd, log, open } = env({ createResult: 'opaque-token' });
  await open();
  const ws = p._hass.callWS; p._hass.callWS = async (m) => (m.type === 'auth/refresh_tokens' && log.ws.some((x) => x.type === 'auth/long_lived_access_token') ? [] : ws(m));
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(fd.sent.length, 0); assert.equal(HGTv.status, 'err_id');
  assert.match(HGTv.html(p), /tv\.err_id/);
});

test('parowanie: nieudane utworzenie tokenu nic nie wysyła', async () => {
  const { HGTv, p, fill, fd, open } = env({ createFails: true });
  await open();
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(fd.sent.length, 0); assert.equal(HGTv.status, 'err_create');
});

test('parowanie: błąd wysyłki usuwa niewykorzystany token', async () => {
  const { HGTv, p, fill, fd, log, types, open } = env();
  await open();
  fd.document.createElement = () => { throw new Error('blocked'); };
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(HGTv.status, 'err_send');
  assert.deepEqual(log.ws.at(-1), { type: 'auth/delete_refresh_token', refresh_token_id: ID });
  assert.equal(types().includes('frontend/get_user_data'), false);
});

test('parowanie: zamknięcie panelu przerywa odpytywanie bez usuwania tokenu', async () => {
  const { HGTv, p, fill, sleeps, types, open } = env();
  await open();
  HGTv.clock.sleep = async (ms) => { sleeps.push(ms); if (sleeps.length === 2) p._eSheetEl = null; };
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(sleeps.length, 2);
  assert.equal(types().includes('auth/delete_refresh_token'), false);
  assert.equal(HGTv.status, 'idle');
});

test('parowanie: drugie kliknięcie w trakcie nie tworzy drugiego tokenu', async () => {
  const { HGTv, p, fill, types, open } = env();
  await open();
  HGTv.clock.sleep = () => new Promise(() => {});
  fill('10.0.8.117:8798', '482913');
  HGTv.act(p, {}, 'tv-pair'); await tick();
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(types().filter((t) => t === 'auth/long_lived_access_token').length, 1);
});

test('tryb próbny (__hgDryRun): walidacja działa, HA i formularz nietknięte', async () => {
  const { HGTv, p, fill, log, fd, open } = env({ window: { __hgDryRun: true } });
  await open();
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.deepEqual(log.ws, []); assert.equal(fd.sent.length, 0); assert.deepEqual(log.opens, []);
});

/* każdy render strony (html() i wywołania _eLook) trafia do htmls z etykietą kroku; kontrola pozytywna: detektor widzi token w formularzu w chwili wysyłki */
async function leakRun(o, mid) {
  const e = env(o), { HGTv, p, log, fd, fill, open } = e, htmls = [], snap = () => htmls.push(HGTv.html(p));
  await open(); snap();                                                      /* przed wysłaniem */
  p._eLook = () => { log.looks++; snap(); };
  fill('10.0.8.117:8798', '482913');
  if (mid) await mid(e, snap);
  await HGTv.act(p, {}, 'tv-pair'); snap();
  return { ...e, htmls, stages: htmls.map((h) => (/tv\.(working|waiting|connected|timeout|ready|expired)/.exec(h) || [])[1]).filter(Boolean) };
}
const noLeak = (r) => {
  assert.equal(r.fd.sent.length >= 1, true);
  assert.equal(r.fd.sent[0].fields.token, JWT);                              /* token był wysłany w polu formularza */
  assert.equal(r.fd.atSubmit[0].includes(SECRET), true);                     /* i widać go w body tylko w chwili wysyłki: detektor działa */
  assert.equal(r.fd.document.body.innerHTML.includes(SECRET), false);
  r.htmls.forEach((h, n) => assert.equal(h.includes(SECRET), false, 'html #' + n));
  for (const [name, text] of [['toasts', JSON.stringify(r.log.toasts)], ['hgT', JSON.stringify(r.log.hgt)], ['stan', JSON.stringify(r.HGTv)]]) assert.equal(text.includes(SECRET), false, name);
};

test('bezpieczeństwo: token nie trafia do HTML strony, komunikatów ani parametrów tłumaczeń (przed wysyłką, w trakcie odpytywania, po sukcesie)', async () => {
  const r = await leakRun({ seenAfter: 2 });
  assert.equal(r.stages.includes('working'), true); assert.equal(r.stages.includes('waiting'), true); assert.equal(r.stages.at(-1), 'connected');
  noLeak(r);
});

test('bezpieczeństwo: token nie trafia do HTML ani komunikatów po przekroczeniu czasu (i po usunięciu tokenu)', async () => {
  const r = await leakRun({});
  assert.equal(r.stages.includes('waiting'), true); assert.equal(r.stages.at(-1), 'timeout');
  noLeak(r);
});

test('bezpieczeństwo: token nie trafia do HTML ani komunikatów w trybie zablokowanej karty (gotowy, drugie kliknięcie, usuwanie z listy)', async () => {
  const r = await leakRun({ blocked: true, manualHold: true, seenAfter: 1 });
  r.fd.sent.length = 0; r.fd.atSubmit.length = 0;
  assert.equal(r.stages.at(-1), 'ready'); r.htmls.forEach((h) => assert.equal(h.includes(SECRET), false));
  await r.HGTv.act(r.p, {}, 'tv-send'); r.htmls.push(r.HGTv.html(r.p));
  assert.equal(r.fd.sent.length, 1); assert.equal(r.fd.sent[0].fields.token, JWT); assert.equal(r.fd.atSubmit[0].includes(SECRET), true);
  assert.equal(r.stages.concat(r.htmls.map((h) => (/tv\.(connected)/.exec(h) || [])[1])).includes('connected'), true);
  await tick(); await tick();                                                /* lista wczytuje się po sukcesie */
  await r.HGTv.act(r.p, { dataset: { id: OLD } }, 'tv-del'); r.htmls.push(r.HGTv.html(r.p));
  assert.equal(r.log.toasts.at(-1), 'tv.deleted');
  r.htmls.forEach((h, n) => assert.equal(h.includes(SECRET), false, 'html #' + n));
  for (const text of [JSON.stringify(r.log.toasts), JSON.stringify(r.log.hgt), r.fd.document.body.innerHTML, JSON.stringify(r.HGTv)]) assert.equal(text.includes(SECRET), false);
});

test('bezpieczeństwo: token nie trafia do HTML ani komunikatów przy błędzie wysyłki i wygaśnięciu niewysłanego tokenu', async () => {
  const a = env({ blocked: true, manualHold: true }); await a.open(); a.fill('10.0.8.117:8798', '482913');
  const htmls = []; a.p._eLook = () => htmls.push(a.HGTv.html(a.p));
  await a.HGTv.act(a.p, {}, 'tv-pair'); await a.pump(121); htmls.push(a.HGTv.html(a.p));
  assert.equal(a.HGTv.status, 'expired'); assert.equal(htmls.some((h) => h.includes('tv.ready')), true); assert.equal(htmls.at(-1).includes('tv.expired'), true);
  const b = env(); await b.open(); b.fill('10.0.8.117:8798', '482913'); b.fd.document.createElement = () => { throw new Error('blocked'); };
  const hb = []; b.p._eLook = () => hb.push(b.HGTv.html(b.p));
  await b.HGTv.act(b.p, {}, 'tv-pair'); hb.push(b.HGTv.html(b.p));
  assert.equal(b.HGTv.status, 'err_send');
  for (const [x, hs] of [[a, htmls], [b, hb]]) {
    hs.forEach((h) => assert.equal(h.includes(SECRET), false));
    for (const text of [JSON.stringify(x.log.toasts), JSON.stringify(x.log.hgt), x.fd.document.body.innerHTML, JSON.stringify(x.HGTv)]) assert.equal(text.includes(SECRET), false);
  }
});

test('bezpieczeństwo: po wysłaniu ukryty formularz jest usunięty z body', async () => {
  const { HGTv, p, fill, fd, open } = env({ seenAfter: 1 });
  await open();
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.deepEqual(fd.document.body.children, []);
});

test('usuwanie: potwierdzenie przez hgOverlay.alert, tylko tokeny z listy telewizorów', async () => {
  const { HGTv, p, log, st, open } = env();
  await open();
  await HGTv.act(p, { dataset: { id: 'cur' } }, 'tv-del');                 /* bieżąca sesja nie jest na liście */
  await HGTv.act(p, { dataset: { id: 'nieznany' } }, 'tv-del');
  assert.equal(log.alerts.length, 0); assert.deepEqual(log.ws, []);
  st.confirm = false;
  await HGTv.act(p, { dataset: { id: OLD } }, 'tv-del');
  assert.equal(log.alerts.length, 1); assert.deepEqual(log.ws, []);
  assert.equal(log.alerts[0][0].startsWith('tv.delete_title'), true);
  st.confirm = true;
  await HGTv.act(p, { dataset: { id: OLD } }, 'tv-del');
  assert.deepEqual(log.ws.filter((m) => m.type === 'auth/delete_refresh_token'), [{ type: 'auth/delete_refresh_token', refresh_token_id: OLD }]);
  assert.equal(log.toasts.at(-1), 'tv.deleted');
  assert.equal(HGTv.list, null);
});

test('usuwanie: błąd HA daje komunikat, a nie wyjątek', async () => {
  const { HGTv, p, log, open } = env();
  await open();
  const ws = p._hass.callWS; p._hass.callWS = async (m) => { if (m.type === 'auth/delete_refresh_token') throw new Error('x'); return ws(m); };
  await HGTv.act(p, { dataset: { id: OLD } }, 'tv-del');
  assert.equal(log.toasts.at(-1), 'tv.delete_failed');
});

test('wire: wklejony link rozdziela pola w miejscu, Enter uruchamia parowanie', () => {
  const { HGTv, p, fields } = env();
  for (const f of Object.values(fields)) { f.ev = {}; f.addEventListener = (t, fn) => { f.ev[t] = fn; }; }
  HGTv.wire(p, { querySelector: (sel) => fields[sel.slice(6, -1)] || null });
  fields['tv-addr'].value = 'http://10.0.8.117:8798/pair?c=482913'; fields['tv-addr'].ev.input();
  assert.equal(fields['tv-addr'].value, '10.0.8.117:8798'); assert.equal(fields['tv-code'].value, '482913');
  assert.deepEqual([HGTv.s.addr, HGTv.s.code], ['10.0.8.117:8798', '482913']);
  fields['tv-ha'].value = 'https://ha.example.com/'; fields['tv-ha'].ev.input();
  assert.equal(HGTv.s.ha, 'https://ha.example.com/');
  let prevented = false, paired = 0; HGTv.pair = async () => { paired++; };
  fields['tv-code'].ev.keydown({ key: 'Enter', preventDefault() { prevented = true; } });
  fields['tv-code'].ev.keydown({ key: 'a', preventDefault() { assert.fail('only Enter is handled'); } });
  assert.equal(prevented, true); assert.equal(paired, 1);
});

const gateRefresh = (p, st) => {
  const ws = p._hass.callWS; const gate = {};
  p._hass.callWS = (m) => {
    if (m.type === 'auth/refresh_tokens' && gate.armed) { gate.armed = false; const snap = st.tokens.map((t) => ({ ...t })); return new Promise((r) => { gate.release = () => r(snap); }); }
    return ws(m);
  };
  return gate;
};

test('lista: usunięcie w trakcie trwającego wczytywania nigdy nie pokazuje usuniętego tokenu (spóźniona odpowiedź jest odrzucana)', async () => {
  const { HGTv, p, log, st, open } = env();
  await open();
  assert.match(HGTv.html(p), /Nuvio TV 2026-10-24 20:00/);
  const gate = gateRefresh(p, st);
  const htmls = []; p._eLook = () => { log.looks++; htmls.push(HGTv.html(p)); };
  st.confirm = new Promise((r) => { gate.confirm = r; });
  const del = HGTv.act(p, { dataset: { id: OLD } }, 'tv-del'); await tick();    /* okno potwierdzenia otwarte, lista nadal widoczna */
  gate.armed = true;
  await HGTv.act(p, {}, 'tv-reload'); await tick();                              /* wczytywanie startuje, odpowiedź (z OLD) czeka */
  assert.equal(typeof gate.release, 'function');
  gate.confirm(true); await del; await tick();                                   /* usunięcie kończy się, zanim przyjdzie stara odpowiedź */
  assert.equal(st.tokens.some((t) => t.id === OLD), false);
  gate.release(); await tick(); await tick(); await tick();                      /* spóźniona odpowiedź z usuniętym tokenem */
  htmls.push(HGTv.html(p)); await tick(); await tick(); htmls.push(HGTv.html(p));
  const afterDelete = htmls.slice(1);
  afterDelete.forEach((h, n) => assert.equal(h.includes('Nuvio TV 2026-10-24 20:00'), false, 'html #' + n));
  assert.equal((HGTv.list || []).some((t) => t.id === OLD), false);
  assert.match(HGTv.html(p), /tv\.list_empty/);
});

test('lista: nowsze wczytanie wygrywa ze starszym, które kończy się później', async () => {
  const { HGTv, p, st, open } = env();
  await open();
  const gate = gateRefresh(p, st);
  gate.armed = true;
  await HGTv.act(p, {}, 'tv-reload'); HGTv.html(p); await tick();                /* wczytanie 1 czeka z listą [OLD] */
  const first = gate.release;
  st.tokens = [];
  await HGTv.act(p, {}, 'tv-reload'); HGTv.html(p); await tick(); await tick(); await tick();   /* wczytanie 2 kończy z pustą listą */
  assert.deepEqual(HGTv.list, []);
  first(); await tick(); await tick();
  assert.deepEqual(HGTv.list, []);
  assert.doesNotMatch(HGTv.html(p), /Nuvio TV 2026-10-24 20:00/);
});

const HTTP_HA = 'http://ha.local:8123';

test('czas oczekiwania: stałe nazwane, https 60 s, http 120 s', () => {
  const { HGTv } = env();
  assert.equal(HGTv.WAIT_MS, 60000); assert.equal(HGTv.WAIT_HTTP_MS, 120000); assert.equal(HGTv.POLL_MS, 3000);
});

test('czas oczekiwania: http czeka dłużej niż 60 s i potwierdza po 100 s, komunikat podaje 120 sekund', async () => {
  const { HGTv, p, fill, sleeps, log, types, open } = env({ seenAfter: 34 });
  await open();
  const htmls = []; p._eLook = () => { log.looks++; htmls.push(HGTv.statusText()); };   /* statusText zamiast html(): render nie uruchamia dodatkowego wczytywania listy */
  fill('10.0.8.117:8798', '482913', HTTP_HA);
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(sleeps.length, 34); assert.equal(sleeps.reduce((a, b) => a + b, 0), 102000);
  assert.equal(sleeps.every((ms) => ms === 3000), true);
  assert.equal(HGTv.status, 'done'); assert.equal(types().includes('auth/delete_refresh_token'), false);
  assert.equal(htmls.some((h) => h.includes('tv.waiting{"seconds":120}')), true);
});

test('czas oczekiwania: https kończy po 60 s, usuwa token, komunikat podaje 60 sekund', async () => {
  const { HGTv, p, fill, sleeps, st, log, open } = env({ seenAfter: 21 });
  await open();
  const htmls = []; p._eLook = () => { log.looks++; htmls.push(HGTv.statusText()); };
  fill('10.0.8.117:8798', '482913', 'https://ha.example.com');
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(sleeps.length, 20); assert.equal(log.seenPolls, 20);
  assert.equal(HGTv.status, 'timeout'); assert.deepEqual(log.ws.at(-1), { type: 'auth/delete_refresh_token', refresh_token_id: ID });
  assert.equal(st.tokens.some((t) => t.id === ID), false);
  assert.equal(htmls.some((h) => h.includes('tv.waiting{"seconds":60}')), true);
});

test('czas oczekiwania: http bez znacznika kończy dopiero po 120 s i usuwa token', async () => {
  const { HGTv, p, fill, sleeps, st, log, open } = env();
  await open();
  fill('10.0.8.117:8798', '482913', HTTP_HA);
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(sleeps.length, 40); assert.equal(log.seenPolls, 40);
  assert.equal(HGTv.status, 'timeout'); assert.deepEqual(log.ws.at(-1), { type: 'auth/delete_refresh_token', refresh_token_id: ID });
  assert.equal(st.tokens.some((t) => t.id === ID), false);
});

test('czas oczekiwania: http po drugim kliknięciu (zablokowana karta) też czeka 120 s', async () => {
  const { HGTv, p, fill, sleeps, log, open } = env({ blocked: true, manualHold: true, seenAfter: 34 });
  await open();
  fill('10.0.8.117:8798', '482913', HTTP_HA);
  await HGTv.act(p, {}, 'tv-pair');
  await HGTv.act(p, {}, 'tv-send');
  assert.equal(sleeps.filter((ms) => ms === 3000).length, 34); assert.equal(HGTv.status, 'done');
  assert.equal(log.ws.some((m) => m.type === 'auth/delete_refresh_token'), false);
});
