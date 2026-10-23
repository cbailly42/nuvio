/* Kiosk mode keeps the screen on (Screen Wake Lock), and only then. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const core = readFileSync(new URL('../../src/parts/hg-core.part.js', import.meta.url), 'utf8');
const page = readFileSync(new URL('../../src/parts/hg-page.part.js', import.meta.url), 'utf8');
const start = core.indexOf('const hgKmScreen = ');
const end = core.indexOf('if (!window.__hgKmScreen)');
const lit = core.slice(start + 'const hgKmScreen = '.length, end).trim().replace(/;$/, '');
const make = (env) => new Function('hgKmOff', 'document', 'navigator', 'location', 'window', 'getComputedStyle', `return ${lit}`)(env.off, env.document, env.nav, env.location, env.window, env.getComputedStyle);
const tick = () => new Promise((r) => setTimeout(r, 0));
const fakeNav = () => {
  const n = { calls: 0, wakeLock: { request: () => { n.calls += 1; const l = { released: false, ev: {}, addEventListener: (k, f) => { l.ev[k] = f; }, release: () => { l.released = true; if (l.ev.release) l.ev.release(); } }; n.last = l; return Promise.resolve(l); } } };
  return n;
};
const world = ({ km = null, header = 'flex', search = '', admin = false, kiosk = true, off = false, hidden = false, hass = true } = {}) => {
  const headerEl = {};
  const hui = { shadowRoot: { querySelector: (s) => (s === '.header' ? headerEl : null) }, lovelace: { config: km ? { kiosk_mode: km } : {} } };
  const panel = { shadowRoot: { querySelector: (s) => (s === 'hui-root' ? hui : null) } };
  const main = { shadowRoot: { querySelector: (s) => (s === 'partial-panel-resolver' ? null : s === 'ha-panel-lovelace' ? panel : null) } };
  const ha = { shadowRoot: { querySelector: (s) => (s === 'home-assistant-main' ? main : null) } };
  return {
    off: () => off,
    document: { hidden, querySelector: (s) => (s === 'home-assistant' ? ha : null) },
    nav: fakeNav(),
    location: { search },
    window: { KioskMode: kiosk ? {} : undefined, __hgHass: hass ? { user: { is_admin: admin } } : null },
    getComputedStyle: (el) => ({ display: el === headerEl ? header : 'flex' }),
  };
};
const boot = (opt) => { const env = world(opt); const s = make(env); s.page(1); return { env, s }; };

test('no wake lock without a Nuvio page, the plugin, or an active kiosk rule', async () => {
  const idle = world({ km: { hide_header: true } }); const idleS = make(idle); idleS.arm(); await tick(); assert.equal(idle.nav.calls, 0, 'page not connected');
  const bare = boot({ kiosk: false, km: { hide_header: true } }); await tick(); assert.equal(bare.env.nav.calls, 0, 'plugin missing');
  const plain = boot(); await tick(); assert.equal(plain.env.nav.calls, 0, 'kiosk installed but nothing hidden');
});

test('wake lock follows kiosk config, the query string, and a hidden header', async () => {
  const header = boot({ km: { hide_header: true } }); await tick(); assert.equal(header.env.nav.calls, 1);
  header.s.arm(); await tick(); assert.equal(header.env.nav.calls, 1, 'still held');
  const side = boot({ km: { hide_sidebar: true }, admin: true }); await tick(); assert.equal(side.env.nav.calls, 1);
  const users = boot({ km: { non_admin_settings: { kiosk: true } }, admin: false }); await tick(); assert.equal(users.env.nav.calls, 1);
  const admin = boot({ km: { non_admin_settings: { kiosk: true } }, admin: true }); await tick(); assert.equal(admin.env.nav.calls, 0, 'admin is not under the non-admin rule');
  const unknown = boot({ km: { non_admin_settings: { kiosk: true } }, hass: false }); await tick(); assert.equal(unknown.env.nav.calls, 0);
  const shared = boot({ km: { hide_header: true }, admin: false }); await tick(); assert.equal(shared.env.nav.calls, 1, 'base rule applies when non-admins have no override');
  const q = boot({ search: '?kiosk' }); await tick(); assert.equal(q.env.nav.calls, 1);
  const qOff = boot({ search: '?kiosk=false' }); await tick(); assert.equal(qOff.env.nav.calls, 0);
  const css = boot({ header: 'none' }); await tick(); assert.equal(css.env.nav.calls, 1, 'header actually hidden');
});

test('disable_km, the user-menu switch, and a hidden tab release the lock', async () => {
  const dis = boot({ km: { kiosk: true }, search: '?disable_km' }); await tick(); assert.equal(dis.env.nav.calls, 0);
  const menu = boot({ km: { kiosk: true }, off: true }); await tick(); assert.equal(menu.env.nav.calls, 0);
  const gone = boot({ km: { hide_header: true }, hidden: true }); await tick(); assert.equal(gone.env.nav.calls, 0);
  const held = boot({ km: { hide_sidebar: true } }); await tick(); assert.equal(held.env.nav.calls, 1);
  held.env.nav.last.release(); assert.equal(held.s.wl, null);
  held.s.arm(); await tick(); assert.equal(held.env.nav.calls, 2, 'asked again after the browser released it');
  held.env.window.KioskMode = undefined; held.s.arm(); await tick(); assert.equal(held.s.wl, null, 'dropped when kiosk goes away');
  assert.equal(held.env.nav.last.released, true);
});

test('a rejected or missing Wake Lock API does not throw', async () => {
  const env = world({ km: { kiosk: true } });
  env.nav.wakeLock.request = () => Promise.reject(new Error('denied'));
  const s = make(env); s.page(1); await tick(); assert.equal(s.q, false);
  const env2 = world({ km: { kiosk: true } }); env2.nav = {};
  assert.doesNotThrow(() => { const s2 = make(env2); s2.page(1); s2.arm(); });
});

test('the page asks again when it becomes visible, and only a real Nuvio view is counted', () => {
  assert.match(core, /visibilitychange', \(\) => \{ if \(!document\.hidden\) hgKmScreen\.arm\(\); \}/);
  assert.match(page, /if \(this\._config && this\._config\.redirect\) \{ this\._redirTo = null; return this\._redirect\(\); \}\n    hgKmScreen\.page\(1\);/);
  assert.match(page, /if \(this\._config && this\._config\.redirect\) return;\n    hgKmScreen\.page\(-1\);/);
});
