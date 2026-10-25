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
  const log = { ws: [], toasts: [], looks: 0, alerts: [], hgt: [], seenPolls: 0, order: [], opens: [], fetches: [], timers: [] };
  const fd = fakeDocument();
  const st = { tokens: [row(), SESSION], marker: {}, seenAfter: Infinity, createResult: JWT, confirm: true, createFails: false, ...o };
  /* karta TV: window.open('', nazwa) daje uchwyt albo null (zablokowana) albo wyjątek; kolejność wywołań w log.order */
  const tab = { opener: 'dashboard', closed: false, closeCalls: 0, close() { this.closeCalls++; if (o.closeThrows) throw new Error('cross origin'); this.closed = true; } };
  /* fetch telewizora: o.fetchAs = status (domyślnie 200), 'typeerror' (stara aplikacja bez nagłówka CORS albo telewizor niedostępny) albo 'hang' (czeka na przerwanie przez AbortController) */
  const fetchFn = (url, init) => {
    log.order.push('fetch'); log.fetches.push([url, init]);
    return new Promise((res, rej) => {
      if (o.fetchAs === 'typeerror') return rej(new TypeError('Failed to fetch'));
      if (o.fetchAs === 'hang') return init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      return res({ status: o.fetchAs ?? 200 });
    });
  };
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
    window: { open: openFn, ...(o.window || {}) }, document: fd.document, location: { origin: o.proto === 'http:' ? 'http://ha.local:8123' : 'https://ha.example.com', protocol: o.proto || 'https:' }, HG_LOC: () => 'en',
    fetch: fetchFn,
    setTimeout: (fn, ms) => { log.timers.push({ fn, ms, cleared: false }); return log.timers.length - 1; },
    clearTimeout: (i) => { if (log.timers[i]) log.timers[i].cleared = true; },
    H: { esc, icon: (i) => `<ha-icon icon="${i}"></ha-icon>` },
    hgT: (k, a) => { log.hgt.push([k, a]); return k + (a ? JSON.stringify(a) : ''); },
    hgOverlay: { alert: async (...a) => { log.alerts.push(a); return st.confirm; } },
    HTMLElement: class {}, customElements: { get: () => null, define() {} },
  };
  const { HGTv } = loadParts(['ui/form.part.js', 'hg-tvlogic.part.js', 'hg-tv.part.js'], globals, ['HGTv']);
  /* zegar sterowany z testu: sleep przesuwa czas; przy manualHold każde sleep(1000) (pętla hold) czeka, aż pump() je zwolni */
  let t = 0; const sleeps = [], holds = [], holdSleeps = [];
  /* pętla hold (tylko gdy token czeka w this.ready) i odpytywanie znacznika mają ten sam krok 1 s: przy manualHold bramkowane jest tylko hold */
  HGTv.clock = { now: () => t, sleep: async (ms) => {
    if (o.manualHold && ms === 1000 && HGTv.ready) { holdSleeps.push(ms); await new Promise((r) => holds.push(r)); } else sleeps.push(ms);
    t += ms;
  } };
  const pump = async (n) => { for (let i = 0; i < n; i++) { await tick(); const w = holds.shift(); if (w) w(); } await tick(); };
  HGTv.now = () => new Date(2026, 9, 25, 14, 30);
  const fill = (addr, code, ha = 'https://ha.example.com') => { fields['tv-addr'].value = addr; fields['tv-code'].value = code; fields['tv-ha'].value = ha; };
  const types = () => log.ws.map((m) => m.type);
  /* pierwszy render uruchamia wczytanie listy; po nim czyścimy dziennik wywołań i licznik odpytań */
  const open = async () => { HGTv.html(p); await tick(); await tick(); log.ws.length = 0; log.seenPolls = 0; log.order.length = 0; log.opens.length = 0; log.fetches.length = 0; };
  return { HGTv, p, log, st, fd, fields, fill, sleeps, holdSleeps, types, open, tab, pump };
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

test('html: tytuł strony ma znaczek Beta z katalogu, jako zwykły tekst w nagłówku bez dodatkowej roli', () => {
  const { HGTv, p, log } = env();
  const h = HGTv.html(p);
  const head = h.match(/<h4 id="tv-h">([\s\S]*?)<\/h4>/)[1];
  assert.match(head, /<b class="tv-beta">tv\.beta<\/b>/);
  assert.doesNotMatch(head, /role=/);
  assert.equal(log.hgt.some(([k]) => k === 'tv.beta'), true);
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
  assert.equal(HGTv.status, 'done');
  assert.equal(tab.closed, true);                                            /* po potwierdzeniu znacznikiem karta zamyka się sama */
  assert.equal(log.fetches.length, 0);                                       /* strona https nie używa fetch */
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

test('parowanie: unikalna nazwa, token, formularz POST, odpytywanie co 1 s i potwierdzenie znacznikiem', async () => {
  const { HGTv, p, fill, st, fd, sleeps, types, log, open } = env({ seenAfter: 3 });
  await open(); st.tokens = [row({ client_name: 'Nuvio TV 2026-10-25 14:30' })];
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.deepEqual(types().slice(0, 3), ['auth/refresh_tokens', 'auth/long_lived_access_token', 'frontend/get_user_data']);
  assert.deepEqual(log.ws[1], { type: 'auth/long_lived_access_token', client_name: 'Nuvio TV 2026-10-25 14:30 2', lifespan: 3650 });
  assert.equal(fd.sent.length, 1);
  assert.deepEqual(fd.sent[0], { action: 'http://10.0.8.117:8798/pair', method: 'post', target: 'nuvio-tv-pair', rel: undefined, fields: { code: '482913', url: 'https://ha.example.com', token: JWT } });
  assert.deepEqual(sleeps, [1000, 1000, 1000]);
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

test('parowanie: po 60 s bez znacznika token jest usuwany (60 odpytań co 1 s), komunikat o braku odpowiedzi', async () => {
  const { HGTv, p, fill, st, sleeps, log, open } = env();
  await open();
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(sleeps.length, 60);
  assert.equal(log.seenPolls, 60);
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
  return { ...e, htmls, stages: htmls.map((h) => (/tv\.(working|waiting|accepted|connected|timeout|ready|expired)/.exec(h) || [])[1]).filter(Boolean) };
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

const HTTP_HA = 'http://ha.local:8123';            /* adres prywatny: telewizor nie pyta o zgodę, więc 60 s */
const HTTP_PUB = 'http://ha.example.org:8123';     /* adres publiczny przez http: telewizor pyta o zgodę, więc 120 s */

test('czas oczekiwania: stałe nazwane, 60 s, 120 s i odpytywanie co 1 s', () => {
  const { HGTv } = env();
  assert.equal(HGTv.WAIT_MS, 60000); assert.equal(HGTv.WAIT_HTTP_MS, 120000); assert.equal(HGTv.POLL_MS, 1000);
});

test('czas oczekiwania: http z hostem publicznym czeka dłużej niż 60 s i potwierdza po 100 s, komunikat podaje 120 sekund', async () => {
  const { HGTv, p, fill, sleeps, log, types, open } = env({ seenAfter: 100 });
  await open();
  const htmls = []; p._eLook = () => { log.looks++; htmls.push(HGTv.statusText()); };   /* statusText zamiast html(): render nie uruchamia dodatkowego wczytywania listy */
  fill('10.0.8.117:8798', '482913', HTTP_PUB);
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(sleeps.length, 100); assert.equal(sleeps.reduce((a, b) => a + b, 0), 100000);
  assert.equal(sleeps.every((ms) => ms === 1000), true);
  assert.equal(HGTv.status, 'done'); assert.equal(types().includes('auth/delete_refresh_token'), false);
  assert.equal(htmls.some((h) => h.includes('tv.waiting{"seconds":120}')), true);
});

test('czas oczekiwania: https kończy po 60 s, usuwa token, komunikat podaje 60 sekund', async () => {
  const { HGTv, p, fill, sleeps, st, log, open } = env({ seenAfter: 61 });
  await open();
  const htmls = []; p._eLook = () => { log.looks++; htmls.push(HGTv.statusText()); };
  fill('10.0.8.117:8798', '482913', 'https://ha.example.com');
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(sleeps.length, 60); assert.equal(log.seenPolls, 60);
  assert.equal(HGTv.status, 'timeout'); assert.deepEqual(log.ws.at(-1), { type: 'auth/delete_refresh_token', refresh_token_id: ID });
  assert.equal(st.tokens.some((t) => t.id === ID), false);
  assert.equal(htmls.some((h) => h.includes('tv.waiting{"seconds":60}')), true);
  assert.equal(htmls.some((h) => h.includes('"seconds":120')), false);
});

test('czas oczekiwania: http z hostem prywatnym (.local, 10.x, 192.168.x) czeka tylko 60 s, host publiczny 120 s i usuwa token dopiero wtedy', async () => {
  for (const [ha, polls] of [[HTTP_HA, 60], ['http://10.0.0.5:8123', 60], ['http://192.168.1.2:8123', 60], [HTTP_PUB, 120], ['http://8.8.8.8:8123', 120], ['http://[::1]:8123', 120]]) {
    const { HGTv, p, fill, sleeps, st, log, open } = env();
    await open();
    fill('10.0.8.117:8798', '482913', ha);
    await HGTv.act(p, {}, 'tv-pair');
    assert.equal(sleeps.length, polls, ha); assert.equal(log.seenPolls, polls, ha);
    assert.equal(HGTv.status, 'timeout', ha); assert.deepEqual(log.ws.at(-1), { type: 'auth/delete_refresh_token', refresh_token_id: ID }, ha);
    assert.equal(st.tokens.some((t) => t.id === ID), false, ha);
  }
});

test('czas oczekiwania: http z hostem publicznym po drugim kliknięciu (zablokowana karta) też czeka 120 s', async () => {
  const { HGTv, p, fill, sleeps, holdSleeps, log, open } = env({ blocked: true, manualHold: true, seenAfter: 100 });
  await open();
  fill('10.0.8.117:8798', '482913', HTTP_PUB);
  await HGTv.act(p, {}, 'tv-pair');
  await HGTv.act(p, {}, 'tv-send');
  assert.equal(sleeps.filter((ms) => ms === 1000).length, 100); assert.equal(HGTv.status, 'done');
  assert.equal(holdSleeps.length >= 1, true);
  assert.equal(log.ws.some((m) => m.type === 'auth/delete_refresh_token'), false);
});

/* ===== strona serwowana przez http: wysyłka fetch bez nowej karty ===== */
const httpEnv = (o = {}) => env({ proto: 'http:', ...o });
const until = async (f) => { for (let i = 0; i < 60 && !f(); i++) await tick(); };
const stateText = (e) => JSON.stringify([e.log.toasts, e.log.hgt, e.HGTv]);

test('http: bez window.open i bez formularza, fetch z dokładnym adresem, nagłówkami i treścią, token tylko w treści', async () => {
  const e = httpEnv({ seenAfter: 2 }), { HGTv, p, log, fd, fill, open, st } = e;
  await open(); st.tokens = [row({ client_name: 'Nuvio TV 2026-10-25 14:30' })];
  fill('10.0.8.117:8798', '482913', HTTP_HA);
  await HGTv.act(p, {}, 'tv-pair');
  assert.deepEqual(log.opens, []); assert.deepEqual(fd.sent, []); assert.deepEqual(fd.document.body.children, []);
  assert.equal(log.fetches.length, 1);
  const [url, init] = log.fetches[0];
  assert.equal(url, 'http://10.0.8.117:8798/pair');
  assert.deepEqual(Object.keys(init).sort(), ['body', 'cache', 'credentials', 'headers', 'method', 'mode', 'referrerPolicy', 'signal']);
  assert.equal(init.method, 'POST'); assert.deepEqual(init.headers, { 'Content-Type': 'application/x-www-form-urlencoded' });
  assert.equal(init.body, new URLSearchParams({ code: '482913', url: HTTP_HA, token: JWT }).toString());
  assert.equal(init.mode, 'cors'); assert.equal(init.cache, 'no-store'); assert.equal(init.credentials, 'omit'); assert.equal(init.referrerPolicy, 'no-referrer');
  assert.equal(typeof init.signal.aborted, 'boolean'); assert.equal(init.signal.aborted, false);
  assert.equal(url.includes(SECRET), false);
  assert.equal(JSON.stringify({ ...init, body: '', signal: 0 }).includes(SECRET), false);   /* token tylko w treści żądania */
  assert.equal(init.body.includes(SECRET), true);
  assert.equal(log.order.indexOf('ws:auth/long_lived_access_token') < log.order.indexOf('fetch'), true);   /* token powstaje pierwszy, fetch jest pierwszym użyciem */
  assert.equal(log.order.includes('open'), false);
  assert.equal(stateText(e).includes(SECRET), false);
});

test('http: limit czasu fetch to 8 s (AbortController), zegar jest zdejmowany po odpowiedzi', async () => {
  const { HGTv, p, log, fill, open } = httpEnv({ seenAfter: 1 });
  await open(); fill('10.0.8.117:8798', '482913', HTTP_HA);
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(log.timers.length, 1); assert.equal(log.timers[0].ms, 8000); assert.equal(log.timers[0].cleared, true);
});

test('http: 200 oznacza przyjęcie, komunikat "przyjęto", odpytywanie co 1 s i token zostaje', async () => {
  const e = httpEnv({ fetchAs: 200, seenAfter: 3 }), { HGTv, p, log, fill, open, sleeps, types, st } = e;
  await open(); const shown = []; p._eLook = () => { log.looks++; shown.push(HGTv.statusText()); };
  fill('10.0.8.117:8798', '482913', HTTP_HA);
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(shown.includes('tv.accepted'), true);
  assert.equal(shown.indexOf('tv.accepted') < shown.findIndex((x) => x.includes('tv.connected')), true);
  assert.deepEqual(sleeps, [1000, 1000, 1000]);
  assert.equal(HGTv.status, 'done'); assert.equal(types().includes('auth/delete_refresh_token'), false);
  assert.equal(st.tokens.some((t) => t.id === ID), true);
  assert.match(HGTv.html(p), /tv\.connected/);
});

test('http: 200 bez znacznika kończy po zwykłym czasie i usuwa token', async () => {
  const { HGTv, p, log, fill, open, sleeps, st } = httpEnv({ fetchAs: 200 });
  await open(); fill('10.0.8.117:8798', '482913', HTTP_HA);
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(sleeps.length, 60); assert.equal(HGTv.status, 'timeout');
  assert.deepEqual(log.ws.at(-1), { type: 'auth/delete_refresh_token', refresh_token_id: ID });
  assert.equal(st.tokens.some((t) => t.id === ID), false);
});

test('http: 403, 429, 400, 404 i 500 pokazują właściwy komunikat, kasują świeży token i nie odpytują', async () => {
  for (const [code, key] of [[403, 'tv.err_wrong'], [429, 'tv.err_limit'], [400, 'tv.err_rejected'], [404, 'tv.err_rejected'], [500, 'tv.err_rejected']]) {
    const e = httpEnv({ fetchAs: code }), { HGTv, p, log, fill, open, sleeps, st, fd } = e;
    await open(); const htmls = []; p._eLook = () => { log.looks++; htmls.push(HGTv.html(p)); };
    fill('10.0.8.117:8798', '482913', HTTP_HA);
    await HGTv.act(p, {}, 'tv-pair'); htmls.push(HGTv.html(p));
    assert.match(htmls.at(-1), new RegExp(key.replace('.', '\\.') + '(?![a-z_])'), String(code));
    assert.equal(htmls.at(-1).includes('role="status"'), true);
    assert.equal(HGTv.working(), false, String(code)); assert.match(htmls.at(-1), /data-hge="tv-pair" >/);
    assert.deepEqual(log.ws.filter((m) => m.type === 'auth/delete_refresh_token'), [{ type: 'auth/delete_refresh_token', refresh_token_id: ID }], String(code));
    assert.equal(st.tokens.some((t) => t.id === ID), false, String(code));
    assert.deepEqual(sleeps, [], String(code));                              /* odpytywanie zawsze zaczyna od sleep, a render html() wczytuje tylko listę */
    assert.deepEqual(log.opens, []); assert.deepEqual(fd.sent, []);
    htmls.forEach((h) => assert.equal(h.includes(SECRET), false, code + ' html'));
    assert.equal(stateText(e).includes(SECRET), false, String(code));
  }
});

test('http: komunikaty błędów różnią się między sobą i nie są komunikatem sukcesu', async () => {
  const texts = new Set();
  for (const code of [403, 429, 400]) {
    const { HGTv, p, fill, open } = httpEnv({ fetchAs: code });
    await open(); fill('10.0.8.117:8798', '482913', HTTP_HA); await HGTv.act(p, {}, 'tv-pair');
    texts.add(HGTv.statusText());
  }
  assert.equal(texts.size, 3);
});

test('http: TypeError (stara aplikacja bez nagłówka CORS albo telewizor niedostępny) nie kasuje tokenu i czeka na znacznik', async () => {
  const e = httpEnv({ fetchAs: 'typeerror', seenAfter: 4 }), { HGTv, p, log, fill, open, sleeps, types, st } = e;
  await open(); const shown = []; p._eLook = () => { log.looks++; shown.push(HGTv.statusText()); };
  fill('10.0.8.117:8798', '482913', HTTP_HA);
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(log.fetches.length, 1); assert.deepEqual(log.opens, []);
  assert.equal(shown.some((x) => x.startsWith('tv.waiting')), true); assert.equal(shown.includes('tv.accepted'), false);
  assert.equal(shown.some((x) => /err_/.test(x)), false);
  assert.deepEqual(sleeps, [1000, 1000, 1000, 1000]);
  assert.equal(HGTv.status, 'done'); assert.equal(types().includes('auth/delete_refresh_token'), false);
  assert.equal(st.tokens.some((t) => t.id === ID), true);
  assert.equal(log.timers[0].cleared, true);
  assert.equal(stateText(e).includes(SECRET), false);
});

test('http: TypeError bez znacznika kończy po zwykłym czasie i dopiero wtedy usuwa token', async () => {
  const { HGTv, p, log, fill, open, sleeps, st } = httpEnv({ fetchAs: 'typeerror' });
  await open(); fill('10.0.8.117:8798', '482913', HTTP_HA);
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(sleeps.length, 60); assert.equal(HGTv.status, 'timeout');
  assert.deepEqual(log.ws.filter((m) => m.type === 'auth/delete_refresh_token'), [{ type: 'auth/delete_refresh_token', refresh_token_id: ID }]);
  assert.equal(st.tokens.some((t) => t.id === ID), false);
});

test('http: po 8 s fetch jest przerywany, wynik jest nieznany, więc odpytywanie trwa dalej bez kasowania tokenu', async () => {
  const e = httpEnv({ fetchAs: 'hang', seenAfter: 2 }), { HGTv, p, log, fill, open, types, st } = e;
  await open(); fill('10.0.8.117:8798', '482913', HTTP_HA);
  const run = HGTv.act(p, {}, 'tv-pair');
  await until(() => log.fetches.length === 1);
  const sig = log.fetches[0][1].signal;
  assert.equal(sig.aborted, false); assert.equal(HGTv.status, 'working');
  assert.equal(log.timers.length, 1); assert.equal(log.timers[0].ms, 8000); assert.equal(log.timers[0].cleared, false);
  assert.equal(log.seenPolls, 0);
  log.timers[0].fn();                                                        /* upływa 8 s */
  await run;
  assert.equal(sig.aborted, true);
  assert.equal(HGTv.status, 'done'); assert.equal(types().includes('auth/delete_refresh_token'), false);
  assert.equal(st.tokens.some((t) => t.id === ID), true);
  assert.equal(stateText(e).includes(SECRET), false);
});

test('http: strona https nigdy nie używa fetch, strona http nigdy nie otwiera karty (także gdy karta byłaby zablokowana)', async () => {
  const a = env({ seenAfter: 1 }); await a.open(); a.fill('10.0.8.117:8798', '482913', HTTP_HA);
  await a.HGTv.act(a.p, {}, 'tv-pair');
  assert.equal(a.log.fetches.length, 0); assert.equal(a.log.opens.length, 1); assert.equal(a.fd.sent.length, 1);
  const b = httpEnv({ blocked: true, manualHold: true, seenAfter: 1 }); await b.open(); b.fill('10.0.8.117:8798', '482913', HTTP_HA);
  await b.HGTv.act(b.p, {}, 'tv-pair');
  assert.deepEqual(b.log.opens, []); assert.equal(b.HGTv.status, 'done'); assert.equal(b.HGTv.ready, null);
  assert.equal(b.log.fetches.length, 1);
});

test('http: błąd utworzenia tokenu i nieznane id nic nie wysyłają (fetch nietknięty)', async () => {
  const a = httpEnv({ createFails: true }); await a.open(); a.fill('10.0.8.117:8798', '482913', HTTP_HA);
  await a.HGTv.act(a.p, {}, 'tv-pair');
  assert.equal(a.HGTv.status, 'err_create'); assert.equal(a.log.fetches.length, 0);
  const b = httpEnv({ createResult: 'opaque-token' }); await b.open(); b.fill('10.0.8.117:8798', '482913', HTTP_HA);
  const ws = b.p._hass.callWS; b.p._hass.callWS = async (m) => (m.type === 'auth/refresh_tokens' && b.log.ws.some((x) => x.type === 'auth/long_lived_access_token') ? [] : ws(m));
  await b.HGTv.act(b.p, {}, 'tv-pair');
  assert.equal(b.HGTv.status, 'err_id'); assert.equal(b.log.fetches.length, 0);
});

test('http: zamknięcie panelu w trakcie odpytywania przerywa je bez kasowania tokenu, drugie kliknięcie w trakcie wysyłki nie tworzy drugiego tokenu', async () => {
  const { HGTv, p, log, fill, open, types, sleeps } = httpEnv({ fetchAs: 'hang' });
  await open(); fill('10.0.8.117:8798', '482913', HTTP_HA);
  const run = HGTv.act(p, {}, 'tv-pair');
  await until(() => log.fetches.length === 1);
  await HGTv.act(p, {}, 'tv-pair');                                          /* w trakcie wysyłki przycisk jest zablokowany */
  assert.equal(types().filter((t) => t === 'auth/long_lived_access_token').length, 1); assert.equal(log.fetches.length, 1);
  HGTv.clock.sleep = async (ms) => { sleeps.push(ms); p._eSheetEl = null; };
  log.timers[0].fn(); await run;
  assert.equal(HGTv.status, 'idle'); assert.equal(types().includes('auth/delete_refresh_token'), false);
});

test('bezpieczeństwo: token nie trafia do HTML, komunikatów ani stanu na stronie http (sukces, TypeError, błędy odpowiedzi)', async () => {
  for (const fetchAs of [200, 'typeerror', 403, 429, 400]) {
    const e = httpEnv({ fetchAs, seenAfter: 2 }), { HGTv, p, log, fill, open } = e, htmls = [];
    await open(); htmls.push(HGTv.html(p)); p._eLook = () => { log.looks++; htmls.push(HGTv.html(p)); };
    fill('10.0.8.117:8798', '482913', HTTP_HA);
    await HGTv.act(p, {}, 'tv-pair'); htmls.push(HGTv.html(p)); await tick(); await tick(); htmls.push(HGTv.html(p));
    assert.equal(log.fetches[0][1].body.includes(SECRET), true, 'detektor działa: ' + fetchAs);
    htmls.forEach((h, n) => assert.equal(h.includes(SECRET), false, fetchAs + ' html #' + n));
    assert.equal(htmls.some((h) => /tv\.(working)/.test(h)), true);
    assert.equal(stateText(e).includes(SECRET), false, String(fetchAs));
    assert.equal(e.fd.document.body.innerHTML.includes(SECRET), false);
  }
});

/* ===== strona https: nazwana karta jak dotąd, zamykana po potwierdzeniu ===== */
test('https: karta zamyka się dokładnie raz po potwierdzeniu znacznikiem', async () => {
  const { HGTv, p, fill, tab, open } = env({ seenAfter: 3 });
  await open(); fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(HGTv.status, 'done'); assert.equal(tab.closed, true); assert.equal(tab.closeCalls, 1);
});

test('https: karta nie zamyka się przy przekroczeniu czasu (użytkownik czyta stronę błędu telewizora), zamyka się przy twardym błędzie z kasowaniem tokenu', async () => {
  const a = env(); await a.open(); a.fill('10.0.8.117:8798', '482913');
  await a.HGTv.act(a.p, {}, 'tv-pair');
  assert.equal(a.HGTv.status, 'timeout'); assert.equal(a.tab.closed, false); assert.equal(a.tab.closeCalls, 0);
  assert.deepEqual(a.log.ws.at(-1), { type: 'auth/delete_refresh_token', refresh_token_id: ID });
  const b = env(); await b.open(); b.fill('10.0.8.117:8798', '482913');
  b.fd.document.createElement = () => { throw new Error('blocked'); };
  await b.HGTv.act(b.p, {}, 'tv-pair');
  assert.equal(b.HGTv.status, 'err_send'); assert.equal(b.tab.closed, true); assert.equal(b.tab.closeCalls, 1);
  assert.deepEqual(b.log.ws.at(-1), { type: 'auth/delete_refresh_token', refresh_token_id: ID });
});

test('https: zamknięcie panelu w trakcie odpytywania zostawia kartę otwartą', async () => {
  const { HGTv, p, fill, tab, open, sleeps } = env();
  await open(); HGTv.clock.sleep = async (ms) => { sleeps.push(ms); if (sleeps.length === 2) p._eSheetEl = null; };
  fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair');
  assert.equal(HGTv.status, 'idle'); assert.equal(tab.closeCalls, 0);
});

test('https: już zamknięta karta nie jest zamykana ponownie, a wyjątek z close() nie psuje potwierdzenia', async () => {
  const a = env({ seenAfter: 1 }); await a.open(); a.fill('10.0.8.117:8798', '482913');
  const run = a.HGTv.act(a.p, {}, 'tv-pair');
  a.tab.closed = true;                                                       /* użytkownik zamknął kartę sam */
  await run;
  assert.equal(a.HGTv.status, 'done'); assert.equal(a.tab.closeCalls, 0);
  const b = env({ seenAfter: 1, closeThrows: true }); await b.open(); b.fill('10.0.8.117:8798', '482913');
  await b.HGTv.act(b.p, {}, 'tv-pair');
  assert.equal(b.HGTv.status, 'done'); assert.equal(b.tab.closeCalls, 1);
  assert.match(b.HGTv.html(b.p), /tv\.connected/);
});

test('https: zablokowana karta (drugie kliknięcie, _blank) nie ma uchwytu, więc nic nie jest zamykane', async () => {
  const { HGTv, p, fill, tab, open } = env({ blocked: true, manualHold: true, seenAfter: 2 });
  await open(); fill('10.0.8.117:8798', '482913');
  await HGTv.act(p, {}, 'tv-pair'); await HGTv.act(p, {}, 'tv-send');
  assert.equal(HGTv.status, 'done'); assert.equal(tab.closeCalls, 0);
});
