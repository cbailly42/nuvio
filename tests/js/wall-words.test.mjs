/* Tests for the 'words' Word Clock screensaver style (hg-wallx-words.part.js). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadParts } from './harness.mjs';

const K = (r, g, b, a) => `rgba(${r},${g},${b},${a})`;
const H = {
  esc: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
  icon: () => '',
  fmt: (v) => String(v),
};
const hgT = (k) => k;
const hgTLazy = (k) => k;

function makeHGWall() {
  return {
    XS: [],
    XSDef: {},
    GAL: [],
    xsDef(k, name, pic, def) { this.XSDef[k] = def; this.XS.push([k, name, pic]); this.GAL.push([k, name]); },
    xsShell(k) {
      const def = this.XSDef[k]; if (!def) return '';
      return `<style>${def.css || ''}</style><div class="nx nx-${def.cls}">${def.body()}</div>`;
    },
  };
}

function loadWords() {
  const HGWall = makeHGWall();
  const globals = {
    K, H, hgT, hgTLazy, HGWall,
    HG_WALL_SS: '',
    window: { __hgL: { data: { wall: {} } } },
  };
  loadParts(['hg-wallx.part.js', 'hg-wallx-words.part.js'], globals, []);
  return HGWall;
}

/* ------------------------------------------------------------------
   Registration tests
   ------------------------------------------------------------------ */

test('words key is present in HGWall.XS', () => {
  const W = loadWords();
  assert.ok(W.XS.some(([k]) => k === 'words'), 'words in XS');
});

test('HGWall.XSDef.words exists', () => {
  const W = loadWords();
  assert.ok(W.XSDef.words, 'XSDef.words exists');
});

test('xsShell(words) contains class nx-wd', () => {
  const W = loadWords();
  assert.match(W.xsShell('words'), /nx-wd/, 'has nx-wd class');
});

test('xsShell(words) contains required nx-dt and nx-wx elements', () => {
  const W = loadWords();
  const html = W.xsShell('words');
  assert.match(html, /class="nx-dt"/, 'has nx-dt paragraph');
  assert.match(html, /class="nx-wx"/, 'has nx-wx div');
});

test('body() contains 110 nx-wd-c cells', () => {
  const W = loadWords();
  const html = W.XSDef.words.body();
  const matches = html.match(/nx-wd-c/g);
  assert.equal(matches && matches.length, 110, '110 letter cells');
});

/* ------------------------------------------------------------------
   Phrase function tests
   Words key: IT IS always lit. Phrase logic verified by hand.

   Grid layout (row x col, 0-indexed):
     R0: I T I S H A L F T E N  (indices 0-10)
     R1: Q U A R T E R T W E N  (indices 11-21)
     R2: T Y F I V E P A S T O  (indices 22-32)
     R3: T O O N E T W O S I X  (indices 33-43)
     R4: T H R E E F O U R X X  (indices 44-54)
     R5: F I V E S E V E N X X  (indices 55-65)
     R6: E I G H T E L E V E N  (indices 66-76)
     R7: T W E L V E N I N E X  (indices 77-87)
     R8: T E N O C L O C K X X  (indices 88-98)
     R9: X X X X X X X X X X X  (indices 99-109)

   Word positions:
     it=[0,1] is=[2,3] half=[4-7] tenMin=[8-10]
     quarter=[11-17] twenty=[18-23] fiveMin=[24-27]
     past=[28-31] to=[33-34] one=[35-37] two=[38-40] six=[41-43]
     three=[44-48] four=[49-52] fiveHr=[55-58] seven=[59-63]
     eight=[66-70] eleven=[71-76] twelve=[77-82] nine=[83-86]
     tenHr=[88-90] oclock=[91-96]

   12:00 -> IT IS TWELVE O'CLOCK
     it=[0,1] is=[2,3] twelve=[77-82] oclock=[91-96]
     => [0,1,2,3,77,78,79,80,81,82,91,92,93,94,95,96]

   12:05 -> IT IS FIVE PAST TWELVE
     it=[0,1] is=[2,3] fiveMin=[24-27] past=[28-31] twelve=[77-82]
     => [0,1,2,3,24,25,26,27,28,29,30,31,77,78,79,80,81,82]

   17:30 -> IT IS HALF PAST FIVE
     it=[0,1] is=[2,3] half=[4-7] past=[28-31] fiveHr=[55-58]
     => [0,1,2,3,4,5,6,7,28,29,30,31,55,56,57,58]

   23:59 -> rounds to 24:00 -> midnight -> 12 O'CLOCK
     it=[0,1] is=[2,3] twelve=[77-82] oclock=[91-96]
     => [0,1,2,3,77,78,79,80,81,82,91,92,93,94,95,96]
   ------------------------------------------------------------------ */

test('wdPhrase(12, 0) = IT IS TWELVE OCLOCK', () => {
  const W = loadWords();
  const result = W.wdPhrase(12, 0);
  assert.deepEqual(result, [0,1,2,3,77,78,79,80,81,82,91,92,93,94,95,96]);
});

test('wdPhrase(12, 5) = IT IS FIVE PAST TWELVE', () => {
  const W = loadWords();
  const result = W.wdPhrase(12, 5);
  assert.deepEqual(result, [0,1,2,3,24,25,26,27,28,29,30,31,77,78,79,80,81,82]);
});

test('wdPhrase(17, 30) = IT IS HALF PAST FIVE', () => {
  const W = loadWords();
  const result = W.wdPhrase(17, 30);
  assert.deepEqual(result, [0,1,2,3,4,5,6,7,28,29,30,31,55,56,57,58]);
});

test('wdPhrase(23, 59) = IT IS TWELVE OCLOCK (rounds to midnight)', () => {
  const W = loadWords();
  const result = W.wdPhrase(23, 59);
  assert.deepEqual(result, [0,1,2,3,77,78,79,80,81,82,91,92,93,94,95,96]);
});

test('wdPhrase always includes IT IS (indices 0-3)', () => {
  const W = loadWords();
  for (const [h, m] of [[0,0],[6,15],[11,59],[23,30]]) {
    const r = W.wdPhrase(h, m);
    assert.ok(r.includes(0) && r.includes(1) && r.includes(2) && r.includes(3), `IT IS present at ${h}:${m}`);
  }
});

/* ------------------------------------------------------------------
   draw() tests
   ------------------------------------------------------------------ */

/* Minimal DOM stub for the word clock. draw() calls:
   - root.dataset.wdMin (cache key)
   - root.querySelectorAll('.nx-wd-c') -> NodeList of span-like objects
   - root.querySelector('.nx-wd-grid') -> element for aria-label
*/
function makeRoot() {
  const dataset = {};
  /* 110 cell stubs */
  const cells = Array.from({ length: 110 }, (_, i) => ({
    dataset: { i: String(i) },
    _classes: new Set(),
    classList: null,
    setAttribute() {},
  }));
  cells.forEach((c) => {
    c.classList = {
      contains: (cls) => c._classes.has(cls),
      add: (cls) => c._classes.add(cls),
      remove: (cls) => c._classes.delete(cls),
    };
  });
  const grid = { setAttribute() {} };
  const dt = { textContent: 'DATE_SENTINEL' };
  const wx = { innerHTML: 'WX_SENTINEL' };

  return {
    dataset,
    querySelectorAll(sel) {
      if (sel === '.nx-wd-c') return cells;
      return [];
    },
    querySelector(sel) {
      if (sel === '.nx-wd-grid') return grid;
      if (sel === '.nx-dt') return dt;
      if (sel === '.nx-wx') return wx;
      return null;
    },
    _cells: cells,
    _dt: dt,
    _wx: wx,
  };
}

test('draw() does not throw for 12:00', () => {
  const W = loadWords();
  const root = makeRoot();
  const d = new Date(2024, 0, 1, 12, 0, 0);
  assert.doesNotThrow(() => W.XSDef.words.draw(root, { h: '12', m: '00', ap: '', t: '12:00' }, d, false));
});

test('draw() does not throw for 23:59', () => {
  const W = loadWords();
  const root = makeRoot();
  const d = new Date(2024, 0, 1, 23, 59, 0);
  assert.doesNotThrow(() => W.XSDef.words.draw(root, { h: '23', m: '59', ap: '', t: '23:59' }, d, false));
});

test('draw() lights the correct cells for 12:00', () => {
  const W = loadWords();
  const root = makeRoot();
  const d = new Date(2024, 0, 1, 12, 0, 0);
  W.XSDef.words.draw(root, { h: '12', m: '00', ap: '', t: '12:00' }, d, false);
  const lit = root._cells.filter((c) => c._classes.has('on')).map((c) => +c.dataset.i).sort((a, b) => a - b);
  assert.deepEqual(lit, [0,1,2,3,77,78,79,80,81,82,91,92,93,94,95,96]);
});

test('draw() lights the correct cells for 17:30', () => {
  const W = loadWords();
  const root = makeRoot();
  const d = new Date(2024, 0, 1, 17, 30, 0);
  W.XSDef.words.draw(root, { h: '17', m: '30', ap: '', t: '17:30' }, d, false);
  const lit = root._cells.filter((c) => c._classes.has('on')).map((c) => +c.dataset.i).sort((a, b) => a - b);
  assert.deepEqual(lit, [0,1,2,3,4,5,6,7,28,29,30,31,55,56,57,58]);
});

test('draw() is idempotent: skips DOM update when minute has not changed', () => {
  const W = loadWords();
  const root = makeRoot();
  const d = new Date(2024, 0, 1, 9, 15, 0);
  W.XSDef.words.draw(root, { h: '9', m: '15', ap: '', t: '9:15' }, d, false);
  /* Overwrite one cell class to detect if draw() re-runs */
  root._cells[0]._classes.delete('on');
  /* Same minute - should not re-run */
  W.XSDef.words.draw(root, { h: '9', m: '15', ap: '', t: '9:15' }, d, false);
  assert.ok(!root._cells[0]._classes.has('on'), 'cell 0 not restored because draw was skipped');
});

test('draw() does not touch .nx-dt or .nx-wx', () => {
  const W = loadWords();
  const root = makeRoot();
  const d = new Date(2024, 0, 1, 8, 0, 0);
  W.XSDef.words.draw(root, { h: '8', m: '00', ap: '', t: '8:00' }, d, false);
  assert.equal(root._dt.textContent, 'DATE_SENTINEL', 'draw does not touch .nx-dt');
  assert.equal(root._wx.innerHTML, 'WX_SENTINEL', 'draw does not touch .nx-wx');
});
