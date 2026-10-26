/* #41: wygląd zegara na wygaszaczu. Ustawienia są normalizowane, domyślne wartości nie zmieniają stylów,
   a własna czcionka trafia do @font-face tylko z bezpiecznym adresem. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadParts } from './harness.mjs';

const hgT = (k) => k;
const H = { esc: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'), pct: (v) => v + ' %', icon: () => '' };
function env(wall) {
  const globals = { window: { __hgL: { data: { wall } } }, hgT, hgTLazy: (k) => k, H, document: {}, HGWall: {} };
  const { HGWall } = loadParts(['hg-wallclock.part.js'], globals, ['HGWall']);
  return HGWall;
}

test('defaults keep the existing look: no variables set, system font, 100 %', () => {
  const W = env({});
  const c = W.ckGet();
  assert.equal(c.font, 'system'); assert.equal(c.size, 1); assert.equal(c.weight, 0); assert.equal(c.shadow, null); assert.equal(c.opacity, 1);
  const v = W.ckVars(c);
  for (const k of Object.keys(v)) assert.equal(v[k], '', k + ' stays empty by default');
});

test('invalid values are clamped or dropped', () => {
  const c = env({ clock: { font: 'comic', size: 9, weight: 250, color: 'pink', hex: 'red', shadow: -1, opacity: 0 } }).ckGet();
  assert.equal(c.font, 'system'); assert.equal(c.size, 1.4); assert.equal(c.weight, 0); assert.equal(c.color, 'white');
  assert.equal(c.hex, '#ffffff'); assert.equal(c.shadow, 0); assert.equal(c.opacity, 0.3);
});

test('custom font URL is only accepted for /local/ or https:// without quotes or brackets', () => {
  assert.equal(env({ clock: { font: 'own', url: '/local/fonts/a.woff2' } }).ckGet().url, '/local/fonts/a.woff2');
  assert.equal(env({ clock: { font: 'own', url: 'https://x.test/f.woff2' } }).ckGet().url, 'https://x.test/f.woff2');
  assert.equal(env({ clock: { font: 'own', url: "x');}body{" } }).ckGet().url, '');
  assert.equal(env({ clock: { font: 'own', url: 'javascript:alert(1)' } }).ckGet().url, '');
  assert.equal(env({ clock: { font: 'own', url: '/a)b.woff2' } }).ckGet().url, '');
});

test('own font emits @font-face only with a valid URL', () => {
  const W = env({ clock: { font: 'own', url: '/local/f.woff2' } });
  assert.match(W.ckFace(W.ckGet()), /@font-face\{font-family:'HG Clock Own'.*src:url\(\/local\/f\.woff2\)/);
  assert.equal(env({ clock: { font: 'own', url: '' } }).ckFace(env({ clock: { font: 'own', url: '' } }).ckGet()), '');
  assert.equal(env({ clock: { font: 'serif' } }).ckFace(env({ clock: { font: 'serif' } }).ckGet()), '');
});

test('colour: accent uses the theme token, custom uses the picked hex', () => {
  const W = env({ clock: { color: 'accent' } });
  assert.equal(W.ckVars(W.ckGet())['--hg-ck-c'], 'var(--hg-accent, #63d71e)');
  const C = env({ clock: { color: 'custom', hex: '#AABBCC' } });
  assert.equal(C.ckVars(C.ckGet())['--hg-ck-c'], '#aabbcc');
});

test('shadow 0 removes the shadow; size and opacity map to CSS variables', () => {
  const W = env({ clock: { shadow: 0, size: 1.2, opacity: 0.6, weight: 700 } });
  const v = W.ckVars(W.ckGet());
  assert.equal(v['--hg-ck-sh'], 'none'); assert.equal(v['--hg-ck-s'], '1.2'); assert.equal(v['--hg-ck-o'], '0.6'); assert.equal(v['--hg-ck-w'], 700);
});

test('the overlay CSS and the settings preview both read the same variables', () => {
  const css = readFileSync(new URL('../../src/parts/hg-wallclock.part.js', import.meta.url), 'utf8');
  for (const v of ['--hg-ck-font', '--hg-ck-w', '--hg-ck-c', '--hg-ck-o', '--hg-ck-s', '--hg-ck-sh']) assert.match(css, new RegExp(v.replace(/-/g, '\\-')));
  const wall = readFileSync(new URL('../../src/parts/hg-wall.part.js', import.meta.url), 'utf8');
  assert.match(css, /const HG_CLOCK_CSS/);
  assert.match(wall, /this\.ckCss\(c\)/);
});

test('clock actions are routed to HGWall.act', () => {
  const wall = readFileSync(new URL('../../src/parts/hg-wall.part.js', import.meta.url), 'utf8');
  assert.match(wall, /a\.startsWith\('wl-ck-'\) && this\.ckAct/);
  const W = env({});
  const calls = [];
  W.set = (p) => calls.push(p);
  const p = { _eLook: () => {} };
  W.ckAct(p, { dataset: { v: 'font=serif' } }, 'wl-ck-s');
  assert.deepEqual(calls[0].clock.font, 'serif', 'a font click saves the choice');
});
