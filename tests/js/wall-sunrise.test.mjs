/* Tests for hg-wallx-sunrise.part.js */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadParts } from './harness.mjs';

/* Minimal globals needed by hg-wallx.part.js and hg-wallx-sunrise.part.js */
const K = (r, g, b, a) => `rgba(${r},${g},${b},${a})`;
const hgT = (k) => k;
const hgTLazy = (k) => k;
const H = {
  esc: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
  pct: (v) => v + ' %',
  icon: () => '',
  fmt: (v) => String(v),
};
const HG_WALL_SS = '';
const HG_ASSET = '/local/';
/* HG_LOC needed by xsDraw */
const HG_LOC = () => 'en-US';

/* Minimal DOM stubs */
function makeRoot(cls = '') {
  const styles = {};
  const data = {};
  const children = {};
  const el = {
    className: cls,
    dataset: new Proxy(data, { get: (t, k) => t[k], set: (t, k, v) => { t[k] = v; return true; } }),
    style: {
      setProperty(k, v) { styles[k] = v; },
      getProperty(k) { return styles[k]; },
      _styles: styles,
    },
    _children: children,
    querySelector(sel) {
      if (!children[sel]) {
        const child = {
          textContent: '',
          innerHTML: '',
          hidden: false,
          dataset: {},
          style: { setProperty() {}, background: '' },
          getAttribute() { return null; },
          setAttribute() {},
          classList: { add() {}, remove() {}, contains() { return false; } },
        };
        children[sel] = child;
      }
      return children[sel];
    },
  };
  return el;
}

function loadWall() {
  const window = { __hgL: { data: { wall: { style: 'sunrise' } } } };
  /* HGWall base object - hg-wallx.part.js needs it to exist */
  const HGWall = {
    XS: [],
    XSDef: {},
    GAL: [],
    xsDef(k, name, pic, def) {
      this.XSDef[k] = def;
      this.XS.push([k, name, pic]);
      this.GAL.push([k, name]);
    },
    xsPic(k) { const x = this.XS.find((y) => y[0] === k); return !!(x && x[2]); },
    xsShell(k) {
      const def = this.XSDef[k];
      if (!def) return '';
      return `<style>${def.css || ''}</style><div class="nx nx-${def.cls}">${def.body()}</div>`;
    },
  };

  /* Load only the sunrise part (it calls HGWall.xsDef directly) */
  const { } = loadParts(
    ['hg-wallx-sunrise.part.js'],
    { K, hgT, hgTLazy, H, HG_WALL_SS, HG_ASSET, HG_LOC, HGWall, window, HGWx: undefined },
    [],
  );
  return HGWall;
}

test('HGWall.XS contains sunrise after loading the part', () => {
  const W = loadWall();
  assert.ok(W.XS.some((x) => x[0] === 'sunrise'), 'sunrise must be in XS');
});

test('xsShell(sunrise) renders with class nx-sr', () => {
  const W = loadWall();
  const html = W.xsShell('sunrise');
  assert.match(html, /nx-sr/, 'shell must contain nx-sr class');
  assert.match(html, /nx-dt/, 'shell must contain nx-dt date element');
  assert.match(html, /nx-wx/, 'shell must contain nx-wx weather element');
  assert.match(html, /<time[^>]*class="nx-t"/, 'shell must contain time.nx-t clock element');
});

test('pure sun-position: pct at 12:00 is greater than at 00:00', () => {
  const W = loadWall();
  const def = W.XSDef['sunrise'];
  const pos00 = def.srPos(0);
  const pos12 = def.srPos(12);
  assert.ok(pos12.pct > pos00.pct, `pct at noon (${pos12.pct}) must be greater than at midnight (${pos00.pct})`);
});

test('palette at 12:00 differs from 00:00', () => {
  const W = loadWall();
  const def = W.XSDef['sunrise'];
  const pos00 = def.srPos(0);
  const pos12 = def.srPos(12);
  assert.notEqual(pos00.palette, pos12.palette, 'palette must differ between midnight and noon');
  assert.equal(pos12.palette, 'day', 'noon must be day palette');
  assert.equal(pos00.palette, 'night', 'midnight must be night palette');
});

test('draw() does not throw for 00:00, 06:00, 12:00, 23:59', () => {
  const W = loadWall();
  const def = W.XSDef['sunrise'];
  const times = [
    [0, 0], [6, 0], [12, 0], [23, 59],
  ];
  for (const [h, m] of times) {
    const root = makeRoot('nx nx-sr');
    const d = new Date(2024, 0, 1, h, m, 0);
    const T = { h: String(h).padStart(2,'0'), m: String(m).padStart(2,'0'), ap: '', t: `${h}:${String(m).padStart(2,'0')}` };
    assert.doesNotThrow(() => def.draw(root, T, d, false), `draw must not throw at ${h}:${String(m).padStart(2,'0')}`);
    assert.doesNotThrow(() => def.draw(root, T, d, true), `draw(rm=true) must not throw at ${h}:${String(m).padStart(2,'0')}`);
  }
});
