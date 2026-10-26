/* header-size-behaviour.test.mjs
   Runs the real HGPage._headVis and HGPage._placeWx code (cut from hg-page.part.js) against
   a fake element, so the title size and weather-hide logic is tested, not only the source text. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../../src/parts/hg-page.part.js', import.meta.url), 'utf8');

/* cut one method body (name(...) { ... }) out of the class by brace matching */
function method(name) {
  const re = new RegExp('\\n  ' + name + '\\([^)]*\\) \\{');
  const m = re.exec(src);
  assert.ok(m, name + ' must exist in hg-page.part.js');
  let i = m.index + m[0].length - 1, depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  return src.slice(m.index + 1, i + 1);
}

/* builds a fake HGPage prototype with only the methods under test */
function harness({ mode = 'wide', hgl = {} } = {}) {
  const headEl = { classList: { toggle(c, on) { this[c] = !!on; } }, dataset: {} };
  const ctx = {
    HGL: { data: hgl },
    hgT: (k) => k,
    console,
  };
  const body = 'class P { constructor(){ this._mode = ' + JSON.stringify(mode) + '; }\n' +
    '  getAttribute(a){ return a === "mode" ? this._mode : null; }\n' +
    method('_headVis') + '\n' + method('_placeWx') + '\n}\nglobalThis.P = P;';
  vm.createContext(ctx);
  vm.runInContext(body, ctx);
  const p = new ctx.P();
  p._headEl = headEl;
  return { p, headEl, ctx };
}

test('_headVis: no sz means no data-sz attribute (current look)', () => {
  const { p, headEl } = harness({ mode: 'wide', hgl: {} });
  p._headVis({});
  assert.equal(headEl.dataset.sz, undefined);
});

test('_headVis: wide size l sets data-sz=l on wide only', () => {
  const hd = { sz: { wide: 'l' } };
  const wide = harness({ mode: 'wide' });
  wide.p._headVis(hd);
  assert.equal(wide.headEl.dataset.sz, 'l');
  const tablet = harness({ mode: 'tablet' });
  tablet.p._headVis(hd);
  assert.equal(tablet.headEl.dataset.sz, undefined, 'a wide-only size must not reach tablet');
});

test('_headVis: medium is treated as default (no data-sz)', () => {
  const { p, headEl } = harness({ mode: 'phone' });
  p._headVis({ sz: { phone: 'm' } });
  assert.equal(headEl.dataset.sz, undefined);
});

test('_headVis: hiding the header still works alongside size', () => {
  const { p, headEl } = harness({ mode: 'phone' });
  p._headVis({ hide: true, sz: { phone: 'xl' } });
  assert.equal(headEl.classList['hd-off'], true);
  assert.equal(headEl.dataset.sz, 'xl');
});

test('_headVis: switching the mode re-derives the size (the mode-change fix)', () => {
  const hd = { sz: { phone: 'xl', wide: 's' } };
  const h = harness({ mode: 'phone' });
  h.p._headVis(hd);
  assert.equal(h.headEl.dataset.sz, 'xl');
  h.p._mode = 'wide';
  h.p._headVis(hd);
  assert.equal(h.headEl.dataset.sz, 's');
});

test('_placeWx: hidden weather removes the element and places nothing', () => {
  let removed = null;
  const wxEl = { parentNode: { removeChild(el) { removed = el; } } };
  const { p, ctx } = harness({ mode: 'wide', hgl: { wiz: { weather: { hide: true } } } });
  p._config = { weather: { entity: 'weather.home' } };
  p._headEl.querySelector = () => null;
  p._wxEl = wxEl;
  p._placeWx();
  assert.equal(removed, wxEl, 'the header weather element is removed when hidden');
});

test('_placeWx: no hide flag does not take the early-return path', () => {
  const { p, ctx } = harness({ mode: 'wide', hgl: { wiz: { weather: {} } } });
  p._config = { weather: { entity: 'weather.home' } };
  let reached = false;
  p._headEl.querySelector = () => { reached = true; return null; };
  ctx.document = { createElement: () => ({ setAttribute() {}, setConfig() {}, toggleAttribute() {}, _config: null }) };
  p._placeWx();
  assert.equal(reached, true, 'without hide, placement continues to find the target');
});
