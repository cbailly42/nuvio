/* #47: a wall tablet answers commands from Home Assistant without browser_mod - the nuvio_command event (admins) and an
   input_text helper (any account), both selected by the name stored for this browser. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadParts } from './harness.mjs';
const read = (f) => readFileSync(new URL('../../' + (f.includes('/') ? f : 'src/parts/' + f), import.meta.url), 'utf8');
const EN = { t: {}, d: {}, m: { locale: 'en-GB' } };
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };

function env(extra = {}) {
  const store = mem(), calls = [];
  const globals = Object.assign({
    window: {}, document: { hidden: false }, localStorage: store, location: { pathname: '/home-glass/dashboard', search: '', href: 'http://ha/home-glass/dashboard' },
    history: { pushState: (...a) => calls.push(['push', a[2]]) },
    HG_LOC: () => 'pl', HG_P: (v) => '/home-glass/' + v,
    HGShell: { _views: () => [{ path: 'dashboard', title: 'Panel' }, { path: 'kamery', title: 'Kamery' }, { title: 'Bez ścieżki', cards: [{ type: 'custom:hg-page', view: 'energia' }] }], root: null },
    H: { icon: () => '', esc: (s) => String(s) },
  }, extra);
  const names = loadParts(['hg-i18n.part.js', 'hg-cmd.part.js'], globals, ['HGDeviceCmd'], { EN });
  return Object.assign({}, names, { store, calls, globals });
}
const setDev = (e, v) => e.HGDeviceCmd.setDevice(v);

test('the device name is a slug kept per browser; an empty name stops listening', () => {
  const e = env(), C = e.HGDeviceCmd;
  assert.equal(setDev(e, 'Salon Tablet'), 'salon-tablet');
  assert.equal(C.device(), 'salon-tablet');
  assert.equal(e.store.getItem('home-glass:wall-device'), 'salon-tablet');
  setDev(e, '  ');
  assert.equal(C.device(), '', 'cleared');
  assert.equal(e.store.getItem('home-glass:wall-device'), null);
  assert.equal(C.slug('Łazienka'), 'lazienka');
});

test('a default name comes from the signed-in user', () => {
  const e = env({});
  assert.equal(e.HGDeviceCmd.defDevice({ user: { name: 'Krzysztof Czepiec' } }), 'nuvio-krzysztof-czepiec');
  assert.equal(e.HGDeviceCmd.defDevice(null), 'nuvio-tablet');
});

test('views come from the dashboard config, including cards and redirects', () => {
  const e = env(), V = e.HGDeviceCmd.views();
  assert.deepEqual(V, [['dashboard', 'Panel'], ['kamery', 'Kamery'], ['energia', 'Bez ścieżki']]);
  assert.equal(e.HGDeviceCmd.path('kamery'), '/home-glass/kamery');
  assert.equal(e.HGDeviceCmd.path('Kamery'), '/home-glass/kamery', 'by title');
  assert.equal(e.HGDeviceCmd.path('/lovelace/0'), '/lovelace/0', 'a full address is kept');
  assert.equal(e.HGDeviceCmd.path('nie-ma'), '/', 'unknown view falls back to the dashboard');
});

test('the event is only accepted for this device name', () => {
  const e = env(), C = e.HGDeviceCmd, seen = [];
  e.globals.window.HGWall = { active: false, show: () => seen.push('show'), lockOn: () => false };
  setDev(e, 'salon');
  assert.equal(C.onEvent({ data: { device: 'kuchnia', action: 'screensaver' } }), false);
  assert.equal(C.onEvent({ data: { device: 'Salon', action: 'screensaver' } }), true, 'readable name, same slug');
  assert.deepEqual(seen, ['show']);
  assert.equal(C.onEvent({ data: { action: 'screensaver' } }), false, 'no device field');
  assert.equal(C.onEvent({ data: { device: 'salon', action: 'explode' } }), false, 'unknown action');
});

test('a helper entity is read from its attributes and only once per command', () => {
  const e = env(), C = e.HGDeviceCmd, seen = [];
  e.globals.window.HGWall = { active: false, show: () => seen.push('show'), lockOn: () => false };
  setDev(e, 'salon');
  assert.equal(C.setEntity('nuvio_salon'), 'input_text.nuvio_salon');
  const st = { state: 'screensaver', last_changed: '2026-10-24T09:00:00Z', attributes: { device: 'salon', action: 'screensaver', view: '' } };
  assert.equal(C.onState('input_text.inny', st), false, 'another entity');
  assert.equal(C.onState('input_text.nuvio_salon', st), true);
  assert.equal(C.onState('input_text.nuvio_salon', st), false, 'the same command is not repeated (reload)');
  assert.equal(seen.length, 1);
  const st2 = Object.assign({}, st, { last_changed: '2026-10-24T09:01:00Z' });
  assert.equal(C.onState('input_text.nuvio_salon', st2), true, 'a new command runs again');
  assert.equal(seen.length, 2);
  const other = { state: 'wake', last_changed: 'x', attributes: { device: 'kuchnia', action: 'wake' } };
  assert.equal(C.onState('input_text.nuvio_salon', other), false, 'another device name');
  assert.equal(C.onState('input_text.nuvio_salon', { state: 'unavailable', attributes: {} }), false);
});

test('a plain text value is also understood: "action view"', () => {
  const e = env(), C = e.HGDeviceCmd;
  assert.deepEqual(C.parse({ state: 'navigate kamery', attributes: { device: 'salon' } }), { device: 'salon', action: 'navigate', view: 'kamery' });
  assert.deepEqual(C.parse({ state: 'wake', attributes: { device: 'salon', action: 'wake', view: '' } }), { device: 'salon', action: 'wake', view: '' });
  assert.equal(C.parse({ state: '', attributes: {} }), null);
});

test('navigate goes to the view and closes the screensaver first', async () => {
  const e = env(), C = e.HGDeviceCmd, nav = [];
  setDev(e, 'salon');
  const page = { _hass: {}, isConnected: true };
  const H = e.globals.H; H.action = (_p, _h, a) => nav.push(a.navigate);   /* H jest wspólny dla wszystkich części (skompilowanych razem) */
  e.globals.window.__hgPage = page;
  e.globals.window.HGWall = { active: false };
  assert.equal(C.run({ action: 'navigate', view: 'kamery' }), true);
  assert.deepEqual(nav, ['/home-glass/kamery']);
  /* otwarty wygaszacz: najpierw wybudzenie (jego animacja), potem widok */
  const W = { active: true, locked: false, wake: () => nav.push('wake-closed') };
  e.globals.window.HGWall = W; e.globals.window.__dbg = [];
  assert.equal(C.run({ action: 'navigate', view: 'kamery' }), true);
  assert.equal(nav[1], 'wake-closed');
  await new Promise((r) => setTimeout(r, 600));
  assert.equal(nav[nav.length - 1], '/home-glass/kamery', 'navigated after the screensaver closed');
  /* zablokowany wygaszacz (PIN) nie przechodzi nigdzie */
  W.locked = true; nav.length = 0;
  assert.equal(C.run({ action: 'navigate', view: 'kamery' }), false);
  assert.deepEqual(nav, []);
});

test('lock shows the screensaver and locks when the PIN lock is on', () => {
  const e = env(), C = e.HGDeviceCmd, seen = [];
  const W = { active: false, show: () => seen.push('show'), lockOn: () => true, lockNow: () => seen.push('pin') };
  e.globals.window.HGWall = W;
  assert.equal(C.run({ action: 'lock' }), true);
  assert.deepEqual(seen, ['show', 'pin']);
  W.lockOn = () => false;
  assert.equal(C.run({ action: 'lock' }), true, 'without a PIN it only covers the dashboard');
});

test('the event is subscribed only for admins with a device name', () => {
  const e = env(), C = e.HGDeviceCmd, subs = [];
  const conn = { subscribeEvents: (_f, t) => { subs.push(t); return Promise.resolve(() => {}); } };
  C.tick({ connection: conn, user: { is_admin: true }, states: {} });
  assert.deepEqual(subs, [], 'no device name yet');
  setDev(e, 'salon');
  C.tick({ connection: conn, user: { is_admin: true }, states: {} });
  assert.deepEqual(subs, ['nuvio_command']);
  const C2 = env(), s2 = [];
  C2.HGDeviceCmd.setDevice('kuchnia');
  C2.HGDeviceCmd.tick({ connection: { subscribeEvents: (_f, t) => { s2.push(t); return Promise.resolve(() => {}); } }, user: { is_admin: false }, states: {} });
  assert.deepEqual(s2, [], 'a non-admin account cannot subscribe');
});

test('the settings sheet has the fields and every action is routed', () => {
  assert.match(read('hg-wall.part.js'), /HGDeviceCmd\.html\(p\)/);
  assert.match(read('hg-wall.part.js'), /HGDeviceCmd\.wire\(p, S\)/);
  assert.match(read('hg-wall.part.js'), /a === 'wl-cmdnav'/);
  assert.match(read('hg-page.part.js'), /HGDeviceCmd\.tick\(h\)/);
  assert.match(read('hg-page.part.js'), /window\.__hgPage = this/);
  assert.match(read('tools/build.py'), /'hg-cmd\.part\.js'/);
  const src = read('hg-cmd.part.js');
  for (const a of ['wake', 'screensaver', 'lock', 'navigate']) assert.ok(src.includes("'" + a + "'"), a);
  assert.match(src, /data-hge="wl-cmdnav"/);
});
