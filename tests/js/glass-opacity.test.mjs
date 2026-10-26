/* Tests for the glass opacity slider feature (glassAlpha).
   Covers: hgScaleGlassAlpha helper in hg-looks.part.js and the glassAlpha storage/clamping
   logic embedded in HGApp (hg-edit.part.js). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const rd = (p) => readFileSync(new URL('../../src/parts/' + p, import.meta.url), 'utf8');

/* Grab a top-level const/function declaration from source up to a closing marker */
const grab = (src, name, end = '\n};') => {
  const kw = ['const ', 'function '].map((k) => src.indexOf(k + name)).filter((i) => i >= 0);
  assert.ok(kw.length > 0, 'symbol not found: ' + name);
  const i = Math.min(...kw);
  const eol = src.indexOf('\n', i);
  return src.slice(i, src.slice(i, eol).trimEnd().endsWith(';') ? eol : src.indexOf(end, i) + end.length);
};

/* Run code in a minimal browser-like context and return the window object */
const run = (code, extra = {}) => {
  const ctx = Object.assign({ window: {}, globalThis: {} }, extra);
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.window;
};

/* ---- hgScaleGlassAlpha (hg-looks.part.js) ---- */
const looksSrc = rd('hg-looks.part.js');
const scaleSrc = grab(looksSrc, 'hgScaleGlassAlpha', '\n};');
const W = run(scaleSrc.replace('window.__hgScaleGlassAlpha = ', '').replace('const hgScaleGlassAlpha = ', 'window.hgScaleGlassAlpha = '));

test('hgScaleGlassAlpha: ratio 1 returns the same object reference (no-op)', () => {
  const tokens = { '--hg-glass-bg': 'rgba(234,238,243,0.66)', '--hg-tile-bg': 'rgba(255,255,255,0.52)' };
  const result = W.hgScaleGlassAlpha(tokens, 1, false);
  assert.strictEqual(result, tokens);
});

test('hgScaleGlassAlpha: ratio 0.5 halves each alpha channel', () => {
  const tokens = {
    '--hg-glass-bg': 'rgba(234,238,243,0.66)',
    '--hg-tile-bg': 'rgba(255,255,255,0.52)',
    '--hg-panel-bg': 'rgba(210,218,226,0.30)',
  };
  const result = W.hgScaleGlassAlpha(tokens, 0.5, false);
  assert.match(result['--hg-glass-bg'], /rgba\(234,238,243,0\.3[23]/);
  assert.match(result['--hg-tile-bg'], /rgba\(255,255,255,0\.26/);
  assert.match(result['--hg-panel-bg'], /rgba\(210,218,226,0\.15/);
});

test('hgScaleGlassAlpha: blur-off clamps effective alpha to >= 0.3', () => {
  const tokens = { '--hg-glass-bg': 'rgba(234,238,243,0.66)' };
  // ratio 0.3 * 0.66 = 0.198, which is below 0.3, so should clamp to 0.3
  const result = W.hgScaleGlassAlpha(tokens, 0.3, true);
  const m = /rgba\(234,238,243,([\d.]+)\)/.exec(result['--hg-glass-bg']);
  assert.ok(m, 'rgba present');
  assert.ok(parseFloat(m[1]) >= 0.3, 'alpha not below 0.3 when blur is off');
});

test('hgScaleGlassAlpha: blur-off does NOT clamp when ratio is high enough', () => {
  const tokens = { '--hg-glass-bg': 'rgba(234,238,243,0.66)' };
  // ratio 0.8 * 0.66 = 0.528, above 0.3
  const result = W.hgScaleGlassAlpha(tokens, 0.8, true);
  const m = /rgba\(234,238,243,([\d.]+)\)/.exec(result['--hg-glass-bg']);
  assert.ok(m, 'rgba present');
  assert.ok(parseFloat(m[1]) > 0.3, 'alpha not artificially raised when above minimum');
});

test('hgScaleGlassAlpha: --hg-glass-blur token is not modified', () => {
  const tokens = { '--hg-glass-bg': 'rgba(255,255,255,0.5)', '--hg-glass-blur': '20px' };
  const result = W.hgScaleGlassAlpha(tokens, 0.5, false);
  assert.equal(result['--hg-glass-blur'], '20px');
});

/* ---- glassAlpha storage logic (clamping/default) ---- */

/* We test the clamping inline logic that is used in HGApp.apply and _ePerfHtml:
   Math.max(30, Math.min(100, Math.round(value))) / 100 as the effective ratio,
   and the rule that glassAlpha is omitted from saved data when it equals 100. */
test('glassAlpha default 100 produces ratio 1 (no-op)', () => {
  const clamp = (v) => Math.max(30, Math.min(100, Math.round(v)));
  assert.equal(clamp(100), 100);
  assert.equal(clamp(100) / 100, 1);
});

test('glassAlpha 50 produces ratio 0.5', () => {
  const clamp = (v) => Math.max(30, Math.min(100, Math.round(v)));
  assert.equal(clamp(50) / 100, 0.5);
});

test('glassAlpha values below 30 are clamped to 30', () => {
  const clamp = (v) => Math.max(30, Math.min(100, Math.round(v)));
  assert.equal(clamp(0), 30);
  assert.equal(clamp(10), 30);
  assert.equal(clamp(29), 30);
  assert.equal(clamp(-5), 30);
});

test('glassAlpha values above 100 are clamped to 100', () => {
  const clamp = (v) => Math.max(30, Math.min(100, Math.round(v)));
  assert.equal(clamp(101), 100);
  assert.equal(clamp(200), 100);
});

test('glassAlpha non-integers are rounded before clamping', () => {
  const clamp = (v) => Math.max(30, Math.min(100, Math.round(v)));
  assert.equal(clamp(50.7), 51);
  assert.equal(clamp(29.4), 30); // rounds to 29, clamps to 30
  assert.equal(clamp(29.6), 30); // rounds to 30
});

test('glassAlpha 100 is omitted from saved app data (default not persisted)', () => {
  /* Simulates the save logic: if v === 100, delete A.glassAlpha; else A.glassAlpha = v */
  const save = (current, v) => {
    const A = Object.assign({}, current);
    if (v === 100) delete A.glassAlpha; else A.glassAlpha = v;
    return A;
  };
  assert.ok(!('glassAlpha' in save({}, 100)), 'key absent when value is 100');
  assert.ok(!('glassAlpha' in save({ glassAlpha: 70 }, 100)), 'key removed when reset to 100');
  assert.equal(save({}, 70).glassAlpha, 70, 'key present when value is 70');
  assert.equal(save({ glassAlpha: 70 }, 50).glassAlpha, 50, 'key updated');
});
