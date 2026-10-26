/* Tests for the 'stars' screensaver style (hg-wallx-stars.part.js). */
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

/* Minimal HGWall stub that mirrors the contract surface used by hg-wallx.part.js and hg-wallx-stars.part.js. */
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

function makeGlobals(HGWall) {
  return {
    K,
    H,
    hgT,
    hgTLazy,
    HGWall,
    /* HG_WALL_SS is defined in hg-wall.part.js (not loaded here); pass an empty string so xsShell works.
       HG_WX_SS is declared as const inside hg-wallx.part.js, so it must NOT be passed as a global. */
    HG_WALL_SS: '',
    window: { __hgL: { data: { wall: {} } } },
  };
}

function loadStars() {
  const HGWall = makeHGWall();
  const globals = makeGlobals(HGWall);
  /* Load hg-wallx.part.js first (defines xsDef etc. via Object.assign), then the stars style. */
  loadParts(['hg-wallx.part.js', 'hg-wallx-stars.part.js'], globals, []);
  return HGWall;
}

test('stars key is present in HGWall.XS', () => {
  const W = loadStars();
  assert.ok(W.XS.some(([k]) => k === 'stars'), 'stars in XS');
});

test('HGWall.XSDef.stars exists', () => {
  const W = loadStars();
  assert.ok(W.XSDef.stars, 'XSDef.stars exists');
});

test('xsShell(stars) contains class nx-st and a time element', () => {
  const W = loadStars();
  const html = W.xsShell('stars');
  assert.match(html, /nx-st/, 'has nx-st class');
  assert.match(html, /<time[^>]*class="nx-t"/, 'has time.nx-t element');
});

test('xsShell(stars) contains nx-dt and nx-wx elements', () => {
  const W = loadStars();
  const html = W.xsShell('stars');
  assert.match(html, /class="nx-dt"/, 'has nx-dt paragraph');
  assert.match(html, /class="nx-wx"/, 'has nx-wx div');
});

/* Minimal DOM stub for draw() tests: querySelector returns a plain object with dataset and innerHTML. */
function makeRoot(html) {
  const elements = {};
  const makeEl = (selector) => {
    if (!elements[selector]) elements[selector] = { dataset: {}, innerHTML: '', textContent: '', hidden: false };
    return elements[selector];
  };
  return {
    querySelector(sel) {
      if (sel === '.nx-t') return makeEl('.nx-t');
      if (sel === '.nx-dt') return makeEl('.nx-dt');
      if (sel === '.nx-wx') return makeEl('.nx-wx');
      return null;
    },
  };
}

test('draw() sets time text for T.t = 21:05 and does not throw', () => {
  const W = loadStars();
  const def = W.XSDef.stars;
  const root = makeRoot();
  const T = { h: '21', m: '05', ap: '', t: '21:05' };
  assert.doesNotThrow(() => def.draw(root, T, new Date(), false));
  const el = root.querySelector('.nx-t');
  assert.equal(el.dataset.k, H.esc('21:05'), 'dataset.k is set to the time string');
});

test('draw() does not throw for 00:00', () => {
  const W = loadStars();
  const def = W.XSDef.stars;
  const root = makeRoot();
  assert.doesNotThrow(() => def.draw(root, { h: '00', m: '00', ap: '', t: '00:00' }, new Date(), false));
});

test('draw() does not throw for 23:59', () => {
  const W = loadStars();
  const def = W.XSDef.stars;
  const root = makeRoot();
  assert.doesNotThrow(() => def.draw(root, { h: '23', m: '59', ap: '', t: '23:59' }, new Date(), false));
});

test('draw() updates time only when it changes (dataset comparison)', () => {
  const W = loadStars();
  const def = W.XSDef.stars;
  const root = makeRoot();
  const T1 = { h: '10', m: '00', ap: '', t: '10:00' };
  def.draw(root, T1, new Date(), false);
  const el = root.querySelector('.nx-t');
  const inner1 = el.innerHTML;
  /* Set innerHTML to a sentinel; draw with same T should not overwrite because dataset.k matches. */
  el.innerHTML = 'SENTINEL';
  def.draw(root, T1, new Date(), false);
  assert.equal(el.innerHTML, 'SENTINEL', 'innerHTML not overwritten when time unchanged');
  /* Now change the time: innerHTML must update. */
  const T2 = { h: '10', m: '01', ap: '', t: '10:01' };
  def.draw(root, T2, new Date(), false);
  assert.notEqual(el.innerHTML, 'SENTINEL', 'innerHTML updated when time changes');
});

test('draw() does not touch .nx-dt or .nx-wx', () => {
  const W = loadStars();
  const def = W.XSDef.stars;
  const root = makeRoot();
  const dt = root.querySelector('.nx-dt');
  const wx = root.querySelector('.nx-wx');
  dt.textContent = 'DATE_SENTINEL';
  wx.innerHTML = 'WX_SENTINEL';
  def.draw(root, { h: '12', m: '00', ap: '', t: '12:00' }, new Date(), false);
  assert.equal(dt.textContent, 'DATE_SENTINEL', 'draw does not touch .nx-dt');
  assert.equal(wx.innerHTML, 'WX_SENTINEL', 'draw does not touch .nx-wx');
});
