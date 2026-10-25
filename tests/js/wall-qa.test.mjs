/* Szybkie przyciski na wygaszaczu (#49): walidacja, biała lista akcji, kod alarmu, przytrzymanie. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadParts } from './harness.mjs';

function env() {
  const calls = [], ev = {}, tl = [];
  const H = {
    call: (h, d, s, data) => { calls.push([d, s, data]); return H.fail ? Promise.reject(new Error('x')) : Promise.resolve(); },
    haptic: () => {}, icon: (i) => `<i ${i}>`, esc: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'), name: (h, e, fb) => fb, fail: false,
  };
  const window = { addEventListener: (t, f) => { ev[t] = f; }, removeEventListener: (t) => { delete ev[t]; } };
  const globals = { window, document: {}, H, hgT: (k, a) => { tl.push([k, a]); return k; }, K: (r, g, b, a) => `rgba(${r},${g},${b},${a})`, HGWall: {}, setTimeout, clearTimeout };
  const { HGWallQA } = loadParts(['hg-wallqa.part.js'], globals, ['HGWallQA']);
  return { Q: HGWallQA, calls, ev, H, tl };
}
const st = (state, attributes) => ({ state, attributes: attributes || {} });

test('norm: max 3 wpisy, odrzuca zła domenę/akcję/encję, przycina pola', () => {
  const { Q } = env();
  const L = Q.norm([
    { e: 'cover.brama', a: 'open' },
    { e: 'light.x', a: 'dance' },
    { e: 'lock.drzwi', a: 'toggle' },
    { e: 'script.zgas', a: 'press', n: '  Zgaś wszystko tutaj bardzo długa nazwa  ', ic: 'mdi:<b>' },
    { e: 'switch.a', a: 'toggle' },
    { e: 'switch.b', a: 'on' },
    'x', null,
  ]);
  assert.deepEqual(L.map((x) => x.e), ['cover.brama', 'script.zgas', 'switch.a']);
  assert.equal(L[1].n.length, 24);
  assert.equal(L[1].ic, '');
  assert.deepEqual([L[0].hold, L[1].hold, L[2].hold], [true, false, false]);
  assert.deepEqual(Q.norm('nie lista'), []);
  assert.deepEqual(Q.norm([{ e: 'switch.a', a: 'on', hold: true }])[0].hold, true);
});

test('norm: nigdy nie przepuszcza kodu ani obcych pól', () => {
  const { Q } = env();
  const x = Q.norm([{ e: 'alarm_control_panel.dom', a: 'disarm', code: '1234', service: 'x.y' }])[0];
  assert.deepEqual(Object.keys(x).sort(), ['a', 'e', 'hold', 'ic', 'n']);
  assert.equal(x.hold, true);
});

test('actions: lista akcji zależna od domeny', () => {
  const { Q } = env();
  assert.deepEqual(Q.actions('cover.g'), ['open', 'close', 'toggle']);
  assert.deepEqual(Q.actions('alarm_control_panel.d'), ['arm_away', 'arm_home', 'arm_night', 'disarm']);
  assert.deepEqual(Q.actions('script.s'), ['press']);
  assert.deepEqual(Q.actions('lock.d'), []);
  assert.deepEqual(Q.actions('zepsute'), []);
});

test('plan: mapowanie akcji na usługi HA', () => {
  const { Q } = env();
  const p = (e, a, s, code) => Q.plan({ e, a }, s, code);
  const D = (domain, service, e, extra) => ({ domain, service, data: Object.assign({ entity_id: e }, extra), need: false, fmt: '' });
  assert.deepEqual(p('script.s', 'press'), D('script', 'turn_on', 'script.s'));
  assert.deepEqual(p('scene.s', 'press'), D('scene', 'turn_on', 'scene.s'));
  assert.deepEqual(p('button.b', 'press'), D('button', 'press', 'button.b'));
  assert.deepEqual(p('input_button.b', 'press'), D('input_button', 'press', 'input_button.b'));
  assert.deepEqual(p('switch.a', 'toggle'), D('homeassistant', 'toggle', 'switch.a'));
  assert.deepEqual(p('light.a', 'on'), D('homeassistant', 'turn_on', 'light.a'));
  assert.deepEqual(p('fan.a', 'off'), D('homeassistant', 'turn_off', 'fan.a'));
  assert.deepEqual(p('input_boolean.a', 'toggle'), D('homeassistant', 'toggle', 'input_boolean.a'));
  assert.deepEqual(p('cover.g', 'open'), D('cover', 'open_cover', 'cover.g'));
  assert.deepEqual(p('cover.g', 'close'), D('cover', 'close_cover', 'cover.g'));
  assert.deepEqual(p('cover.g', 'toggle'), D('cover', 'toggle', 'cover.g'));
  assert.deepEqual(p('alarm_control_panel.d', 'arm_away'), D('alarm_control_panel', 'alarm_arm_away', 'alarm_control_panel.d'));
  assert.deepEqual(p('alarm_control_panel.d', 'arm_home'), D('alarm_control_panel', 'alarm_arm_home', 'alarm_control_panel.d'));
  assert.deepEqual(p('alarm_control_panel.d', 'arm_night'), D('alarm_control_panel', 'alarm_arm_night', 'alarm_control_panel.d'));
  assert.deepEqual(p('alarm_control_panel.d', 'disarm'), D('alarm_control_panel', 'alarm_disarm', 'alarm_control_panel.d'));
  assert.equal(p('cover.g', 'explode'), null);
  assert.equal(p('lock.d', 'toggle'), null);
});

test('plan: kod alarmu tylko gdy encja go wymaga, trafia do data.code', () => {
  const { Q } = env();
  const e = 'alarm_control_panel.d';
  assert.equal(Q.plan({ e, a: 'disarm' }, st('armed_away', {})).need, false);
  const num = st('armed_away', { code_format: 'number', code_arm_required: false });
  assert.deepEqual([Q.plan({ e, a: 'disarm' }, num).need, Q.plan({ e, a: 'disarm' }, num).fmt], [true, 'number']);
  assert.equal(Q.plan({ e, a: 'arm_away' }, num).need, false);
  const req = st('disarmed', { code_format: 'text', code_arm_required: true });
  assert.deepEqual([Q.plan({ e, a: 'arm_away' }, req).need, Q.plan({ e, a: 'arm_away' }, req).fmt], [true, 'text']);
  assert.equal(Q.plan({ e, a: 'disarm' }, num, '1234').data.code, '1234');
  assert.equal('code' in Q.plan({ e, a: 'arm_home' }, num, '1234').data, false);
  assert.equal('code' in Q.plan({ e, a: 'disarm' }, st('armed_away', {}), '1234').data, false);
});

test('isOn: stan przycisku zależny od domeny', () => {
  const { Q } = env();
  assert.equal(Q.isOn('switch.a', st('on')), true);
  assert.equal(Q.isOn('light.a', st('off')), false);
  assert.equal(Q.isOn('cover.g', st('open')), true);
  assert.equal(Q.isOn('cover.g', st('closed')), false);
  assert.equal(Q.isOn('alarm_control_panel.d', st('armed_home')), true);
  assert.equal(Q.isOn('alarm_control_panel.d', st('disarmed')), false);
  assert.equal(Q.isOn('script.s', st('on')), false);
  assert.equal(Q.isOn('switch.a', undefined), false);
});

test('codeKey: klawiatura kodu', () => {
  const { Q } = env();
  assert.deepEqual(Q.codeKey('12', '3'), { buf: '123' });
  assert.deepEqual(Q.codeKey('12', 'del'), { buf: '1' });
  assert.deepEqual(Q.codeKey('', 'del'), { buf: '' });
  assert.deepEqual(Q.codeKey('', 'ok'), { buf: '' });
  assert.deepEqual(Q.codeKey('1234', 'ok'), { buf: '1234', submit: true });
  assert.deepEqual(Q.codeKey('1234', 'cancel'), { buf: '', cancel: true });
  assert.deepEqual(Q.codeKey('123456789012', '5'), { buf: '123456789012' });
  assert.deepEqual(Q.codeKey('1', 'x'), { buf: '1' });
});

test('CSS: warstwa znika przy blokadzie PIN-em i w panelu kodu', () => {
  const { Q } = env();
  assert.match(Q.CSS, /\.nw\.lk \.nw-qa, \.nw\.pin \.nw-qa\{ display:none; \}/);
});

test('build: hg-wallqa jest po hg-wall w PAGE', () => {
  const s = readFileSync(new URL('../../tools/build.py', import.meta.url), 'utf8');
  assert.match(s, /'hg-wall\.part\.js', 'hg-wallqa\.part\.js'/);
});

const mk = (item, states) => ({ hass: { states: states || {} }, get: () => ({ qa: [item] }), last: 0, el: null, locked: false });

test('exec: wywołuje usługę z białej listy i zwraca true', async () => {
  const { Q, calls } = env();
  const w = mk({ e: 'script.zgas', a: 'press', hold: false });
  assert.equal(await Q.exec(w, 0), true);
  assert.deepEqual(calls, [['script', 'turn_on', { entity_id: 'script.zgas' }]]);
});

test('exec: błąd usługi nie rzuca, zwraca false', async () => {
  const { Q, H } = env();
  H.fail = true;
  assert.equal(await Q.exec(mk({ e: 'switch.a', a: 'toggle', hold: false }), 0), false);
});

test('exec: alarm z kodem najpierw pyta o kod, potem wysyła go jako code', async () => {
  const { Q, calls } = env();
  const asked = [];
  Q.ask = (...a) => asked.push(a);
  const w = mk({ e: 'alarm_control_panel.d', a: 'disarm', hold: true }, { 'alarm_control_panel.d': st('armed_away', { code_format: 'number' }) });
  assert.equal(await Q.exec(w, 0), false);
  assert.equal(calls.length, 0);
  assert.equal(asked.length, 1);
  assert.equal(await Q.exec(w, 0, '1234'), true);
  assert.deepEqual(calls, [['alarm_control_panel', 'alarm_disarm', { entity_id: 'alarm_control_panel.d', code: '1234' }]]);
});

test('exec: bez hass nic nie robi', async () => {
  const { Q, calls } = env();
  assert.equal(await Q.exec({ hass: null, get: () => ({ qa: [{ e: 'switch.a', a: 'on', hold: false }] }) }, 0), false);
  assert.equal(calls.length, 0);
});

const btn = () => ({ dataset: { qi: '0' }, isConnected: true, classList: { add() {}, remove() {} } });
const evOn = (b) => ({ type: 'pointerdown', target: { closest: (s) => (s === '.nw-qb' ? b : null) } });

test('tap: dotknięcie bez hold wykonuje akcję od razu', async () => {
  const { Q, calls } = env();
  const w = mk({ e: 'switch.a', a: 'toggle', hold: false });
  assert.equal(Q.tap(w, evOn(btn())), true);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(calls.length, 1);
  assert.ok(w.last > 0);
});

test('tap: poza przyciskiem zwraca false', () => {
  const { Q } = env();
  assert.equal(Q.tap(mk({ e: 'switch.a', a: 'on', hold: false }), { type: 'pointerdown', target: { closest: () => null } }), false);
});

test('tap: hold wykonuje dopiero po przytrzymaniu, puszczenie wcześniej anuluje', async () => {
  const { Q, calls, ev } = env();
  Q.HOLD = 30;
  const w = mk({ e: 'cover.g', a: 'open', hold: true });
  Q.tap(w, evOn(btn()));
  ev.pointerup();
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(calls.length, 0);
  Q.tap(w, evOn(btn()));
  await new Promise((r) => setTimeout(r, 60));
  assert.deepEqual(calls, [['cover', 'open_cover', { entity_id: 'cover.g' }]]);
  assert.equal(ev.pointerup, undefined);
});

test('act: błędny data-i (brak, NaN, -1, 1.5, poza zakresem) jest no-opem; poprawny działa', () => {
  const { Q } = env();
  let cfg = Q.norm([{ e: 'cover.g', a: 'open' }, { e: 'switch.s', a: 'toggle' }]), sets = 0, looks = 0;
  Q.wall = () => ({ get: () => ({ qa: cfg }), set: (x) => { sets++; cfg = x.qa; }, admin: () => true });
  const p = { _eLook() { looks++; } };
  const before = JSON.stringify(cfg);
  for (const act of ['wl-qa-del', 'wl-qa-act', 'wl-qa-hold']) {
    for (const i of [undefined, 'abc', '-1', '1.5', '2', '99', '']) {
      const dataset = i === undefined ? { v: 'close' } : { i, v: 'close' };
      assert.equal(Q.act(p, { dataset }, act), true, `${act} i=${i}`);
    }
    assert.equal(Q.act(p, {}, act), true, `${act} bez dataset`);
  }
  assert.equal(sets, 0);
  assert.equal(looks, 0);
  assert.equal(JSON.stringify(cfg), before);
  Q.act(p, { dataset: { i: '1' } }, 'wl-qa-del');
  assert.deepEqual(cfg.map((x) => x.e), ['cover.g']);
  assert.equal(sets, 1);
  Q.act(p, { dataset: { i: '0', v: 'close' } }, 'wl-qa-act');
  assert.equal(cfg[0].a, 'close');
});

test('html: nazwy z HA i wpisane przez użytkownika są escapowane (wiersz i datalist)', () => {
  const { Q, H } = env();
  const evil = '"><img src=x onerror=alert(1)>';
  H.name = (h, e) => h.states[e].attributes.friendly_name;
  let cfg = Q.norm([{ e: 'cover.g', a: 'open' }, { e: 'switch.s', a: 'toggle', n: '"><b onclick=1>', ic: 'mdi:gate' }]);
  Q.wall = () => ({ get: () => ({ qa: cfg }), admin: () => true });
  const p = { _hass: { states: { 'cover.g': st('closed', { friendly_name: evil }), 'switch.s': st('on', { friendly_name: evil }), 'light.l': st('on', { friendly_name: evil }) } } };
  const h = Q.html(p);
  assert.doesNotMatch(h, /<img|<b onclick/);
  assert.match(h, /<b>&quot;&gt;&lt;img src=x onerror=alert\(1\)&gt;<\/b>/);
  assert.match(h, /<b>&quot;&gt;&lt;b onclick=1&gt;<\/b>/);
  assert.match(h, /value="mdi:gate"/);
  cfg = [];
  const d = Q.html(p);
  assert.doesNotMatch(d, /<img/);
  assert.match(d, /<option value="light\.l">&quot;&gt;&lt;img src=x onerror=alert\(1\)&gt;<\/option>/);
});

test('entities: friendly_name nie-tekstowy nie rzuca', () => {
  const { Q } = env();
  const h = { states: { 'light.a': st('on', { friendly_name: 42 }), 'light.b': st('on', { friendly_name: { x: 1 } }), 'light.c': st('on', { friendly_name: 'Zeta' }), 'lock.x': st('locked') } };
  let out;
  assert.doesNotThrow(() => { out = Q.entities(h); });
  assert.deepEqual(out.map((x) => x[0]).sort(), ['light.a', 'light.b', 'light.c']);
  assert.ok(out.every((x) => typeof x[1] === 'string'));
  assert.equal(out.find((x) => x[0] === 'light.a')[1], '42');
});

test('wire: id z niedozwolonymi znakami daje komunikat, sukces czyści pole', () => {
  const { Q } = env();
  let cfg = [];
  Q.wall = () => ({ get: () => ({ qa: cfg }), set: (x) => { cfg = x.qa; }, admin: () => true });
  const toasts = [];
  const p = { _eLook() {}, _eToast: (t) => toasts.push(t) };
  const add = { value: '', L: {}, addEventListener(t, f) { add.L[t] = f; } };
  Q.wire(p, { querySelector: (s) => (s === '[name=wl-qa-add]' ? add : null), querySelectorAll: () => [] });
  for (const bad of ['light.my-lamp', 'light', 'light.', 'LIGHT.Ok Lamp', 'switch.a.b']) {
    add.value = bad; add.L.change();
    assert.equal(add.value, '', bad);
  }
  assert.deepEqual(toasts, ['wallqa.unsupported', 'wallqa.unsupported', 'wallqa.unsupported', 'wallqa.unsupported', 'wallqa.unsupported']);
  assert.equal(cfg.length, 0);
  add.value = '  Light.Lamp  '; add.L.change();
  assert.equal(add.value, '');
  assert.deepEqual(cfg.map((x) => x.e), ['light.lamp']);
  assert.equal(toasts.length, 5);
  add.value = '   '; add.L.change();
  assert.equal(toasts.length, 5);
});

test('integracja: hg-wall ma zaczepy HGWallQA (get/wk/show/tick/lockNow)', () => {
  const s = readFileSync(new URL('../../src/parts/hg-wall.part.js', import.meta.url), 'utf8');
  assert.match(s, /qa: typeof HGWallQA !== 'undefined' \? HGWallQA\.norm\(/);
  assert.match(s, /qaTap\(e\)/);
  assert.match(s, /this\.qaTap\(e\)/);
  assert.match(s, /HGWallQA\.mount\(this, el\)/);
  assert.match(s, /HGWallQA\.close\(this\)/);
  /* repaint dokładnie raz, w aktywnej gałęzi sync() (tick woła sync) */
  assert.equal((s.match(/HGWallQA\.paint\(this\)/g) || []).length, 1);
  const sync = s.slice(s.indexOf('  sync() {'), s.indexOf('  arm(ms)'));
  assert.match(sync, /this\.active && this\.el\) \{[^]*HGWallQA\.paint\(this\)/);
  const tick = s.slice(s.indexOf('  tick(h, page)'), s.indexOf('  sync() {'));
  assert.doesNotMatch(tick, /HGWallQA\.paint/);
  /* dotyk tła przy otwartym panelu kodu zamyka panel zamiast budzić (po gałęzi locked i dotyku w przycisk, przed wake('touch')) */
  const wk = s.slice(s.indexOf('const wk = (e)'), s.indexOf("el.addEventListener('pointerdown', wk)"));
  assert.match(wk, /HGWallQA\.open\(\)[^]*HGWallQA\.close\(this\)[^]*return;[^]*this\.wake\('touch'\)/);
  assert.ok(wk.indexOf('this.qaTap(e)') < wk.indexOf('HGWallQA.open()'));
  assert.doesNotMatch(s, /HGWallQA\._c/);
});

test('mount: zablokowany saver (lockAfter=0) nie montuje warstwy, ale czyści stan i przytrzymanie', () => {
  const { Q } = env();
  let cancels = 0, appended = 0;
  Q.cancelHold = () => { cancels++; };
  Q._c = { buf: '1' };
  const el = { appendChild: () => { appended++; }, querySelector: () => null };
  Q.mount({ locked: true, el, get: () => ({ qa: Q.norm([{ e: 'switch.a', a: 'toggle' }]) }) }, el);
  assert.equal(appended, 0);
  assert.equal(Q._c, null);
  assert.equal(cancels, 1);
  Q.mount({ locked: false, el, get: () => ({ qa: [] }) }, el);
  assert.equal(appended, 0);
  assert.equal(cancels, 2);
});

test('paint: zablokowany saver usuwa warstwę i nie montuje ponownie; po odblokowaniu wraca', () => {
  const { Q } = env();
  let removed = 0, mounted = 0, layer = { remove() { removed++; } };
  const list = Q.norm([{ e: 'switch.a', a: 'toggle' }]);
  const el = { querySelector: (s) => (s === '.nw-qa' ? layer : null) };
  const w = { el, locked: true, get: () => ({ qa: list }) };
  Q.mount = () => { mounted++; };
  Q.paint(w);
  assert.equal(removed, 1);
  assert.equal(mounted, 0);
  layer = null;
  Q.paint(w);
  assert.equal(mounted, 0);
  w.locked = false;
  Q.paint(w);
  assert.equal(mounted, 1);
});

test('open: true tylko gdy panel kodu jest otwarty', () => {
  const { Q } = env();
  assert.equal(Q.open(), false);
  Q._c = { buf: '' };
  assert.equal(Q.open(), true);
  Q._c = null;
  assert.equal(Q.open(), false);
});

test('ask: w panelu liczbowym OK jest przed Anuluj', () => {
  const { Q } = env();
  const d = fakeDom(), order = [];
  const keys = (h) => [...h.matchAll(/data-k="([^"]+)"/g)].map((m) => m[1]);
  const lock = { insertAdjacentHTML: (pos, h) => { assert.equal(pos, 'beforebegin'); order.unshift(...keys(h)); } };
  order.push('lock');
  d.pp.querySelector = (s) => (s === '.nw-lb' ? lock : s === '.nw-pt > span:nth-of-type(2)' ? d.lead : null);
  d.pp.insertAdjacentHTML = () => { order.push('WRONG-beforeend'); };
  Q.timer = () => {};
  Q.ask({ el: d.el, locked: false, hass: {}, padEl: () => d.pp }, 0, { e: 'alarm_control_panel.d' }, 'number');
  assert.deepEqual(order, ['ok', 'lock']);
});

test('plan/actions: tylko własne właściwości (constructor, toString, __proto__ → null)', () => {
  const { Q } = env();
  assert.equal(Q.plan({ e: 'constructor.x', a: 'name' }), null);
  assert.equal(Q.plan({ e: '__proto__.x', a: 'toString' }), null);
  assert.equal(Q.plan({ e: 'switch.a', a: 'toString' }), null);
  assert.equal(Q.plan({ e: 'switch.a', a: '__proto__' }), null);
  assert.equal(Q.plan({ e: 'switch.a', a: 'constructor' }), null);
  assert.deepEqual(Q.actions('constructor.x'), []);
  assert.deepEqual(Q.actions('__proto__.x'), []);
  assert.deepEqual(Q.norm([{ e: 'switch.a', a: 'toString' }, { e: 'constructor.x', a: 'name' }]), []);
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('hold: odłączony przycisk nie wykonuje akcji po czasie przytrzymania', async () => {
  const { Q, calls, ev } = env();
  Q.HOLD = 20;
  const w = mk({ e: 'cover.g', a: 'open', hold: true });
  const b = btn();
  Q.tap(w, evOn(b));
  b.isConnected = false;
  await wait(50);
  assert.equal(calls.length, 0);
  assert.equal(ev.pointerup, undefined);
});

test('hold: zablokowany wygaszacz nie wykonuje akcji', async () => {
  const { Q, calls } = env();
  Q.HOLD = 20;
  const w = mk({ e: 'cover.g', a: 'open', hold: true });
  Q.tap(w, evOn(btn()));
  w.locked = true;
  await wait(50);
  assert.equal(calls.length, 0);
});

test('hold: zmiana pozycji konfiguracji w trakcie przytrzymania anuluje akcję', async () => {
  const { Q, calls } = env();
  Q.HOLD = 20;
  const w = mk({ e: 'cover.g', a: 'open', hold: true });
  Q.tap(w, evOn(btn()));
  w.get = () => ({ qa: [{ e: 'cover.g', a: 'close', hold: true }] });
  await wait(50);
  assert.equal(calls.length, 0);
});

test('close: anuluje oczekujące przytrzymanie i zdejmuje nasłuch pointerup', async () => {
  const { Q, calls, ev } = env();
  Q.HOLD = 20;
  const w = mk({ e: 'cover.g', a: 'open', hold: true });
  Q.tap(w, evOn(btn()));
  assert.equal(typeof ev.pointerup, 'function');
  Q.close(w);
  assert.equal(ev.pointerup, undefined);
  assert.equal(ev.pointercancel, undefined);
  await wait(50);
  assert.equal(calls.length, 0);
  Q.close(w);
});

test('integracja: wake() wygaszacza zamyka przytrzymanie (HGWallQA.close)', () => {
  const s = readFileSync(new URL('../../src/parts/hg-wall.part.js', import.meta.url), 'utf8');
  assert.match(s, /  wake\(why\) \{[^\n]*HGWallQA\.close\(this\)/);
});

test('ask/close: panel kodu otwiera się i zamyka bez śladu kodu', () => {
  const { Q } = env();
  Q._c = { i: 0, buf: '1234', fmt: 'number' };
  Q.close({ el: null });
  assert.equal(Q._c, null);
});

test('close: nigdy nie rzuca (brak w, brak el) i najpierw anuluje przytrzymanie', async () => {
  const { Q, calls, ev } = env();
  Q.HOLD = 20;
  const order = [];
  const real = Q.cancelHold;
  Q.cancelHold = function () { order.push('cancelHold'); return real.apply(this, arguments); };
  Q.tap(mk({ e: 'cover.g', a: 'open', hold: true }), evOn(btn()));
  for (const w of [undefined, null, {}, { el: null }]) assert.doesNotThrow(() => Q.close(w));
  assert.equal(order[0], 'cancelHold');
  assert.equal(ev.pointerup, undefined);
  await wait(50);
  assert.equal(calls.length, 0);
});

test('press: drugie przytrzymanie anuluje nasłuch i timer pierwszego', async () => {
  const { Q, calls, ev } = env();
  Q.HOLD = 20;
  const ends = [];
  const w = mk({ e: 'cover.g', a: 'open', hold: true });
  const b1 = btn(), b2 = btn();
  b1.classList = { add() {}, remove() { ends.push('b1'); } };
  Q.press(w, b1, 0);
  const first = ev.pointerup;
  Q.press(w, b2, 0);
  assert.deepEqual(ends, ['b1']);
  assert.notEqual(ev.pointerup, first);
  await wait(60);
  assert.equal(calls.length, 1);
});

test('key: submit wysyła kod do exec i czyści bufor, cancel nic nie wysyła', () => {
  const { Q } = env();
  const sent = [];
  Q.exec = (w, i, code) => sent.push([i, code]);
  Q.close = () => { Q._c = null; };
  Q.dots = () => {}; Q.timer = () => {};
  Q._c = { i: 1, buf: '', fmt: 'number' };
  Q.key({}, '4'); Q.key({}, '2'); Q.key({}, 'ok');
  assert.deepEqual(sent, [[1, '42']]);
  assert.equal(Q._c, null);
  Q._c = { i: 1, buf: '9', fmt: 'number' };
  Q.key({}, 'lock');
  assert.equal(sent.length, 1);
  assert.equal(Q._c, null);
});

test('key: tekst czyta wartość z pola, pusty kod nie jest wysyłany', () => {
  const { Q } = env();
  const sent = [];
  Q.exec = (w, i, code) => sent.push([i, code]);
  Q.timer = () => {};
  const inp = { value: 'abC9' };
  const w = { el: { querySelector: (s) => (s === '.nw-pp.qc .nw-qi' ? inp : null), classList: { remove() {} } } };
  Q._c = { i: 2, buf: '', fmt: 'text' };
  Q.key(w, 'ok');
  assert.deepEqual(sent, [[2, 'abC9']]);
  assert.equal(Q._c, null);
  inp.value = '';
  Q._c = { i: 2, buf: '', fmt: 'text' };
  Q.key(w, 'ok');
  assert.equal(sent.length, 1);
  assert.notEqual(Q._c, null);
  Q.close(w);
});

/* mini DOM: wystarcza, by przejść ask → pointerdown → key → close bez przeglądarki */
function fakeDom() {
  const mkEl = () => {
    const cls = new Set(), L = {};
    return { L, classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) }, children: [], dataset: {}, textContent: '' };
  };
  const el = mkEl(), pp = mkEl(), lead = mkEl(), inp = mkEl(), dots = mkEl();
  dots.setAttribute = (k, v) => { dots.attrs = Object.assign(dots.attrs || {}, { [k]: v }); };
  el.focused = 0; el.focus = () => { el.focused++; };
  pp.remove = () => { el.children = el.children.filter((c) => c !== pp); };
  pp.addEventListener = (t, f) => { pp.L[t] = f; };
  pp.insertAdjacentHTML = (_p, h) => { pp.html = (pp.html || '') + h; };
  inp.addEventListener = (t, f) => { inp.L[t] = f; };
  inp.focus = () => { inp.focused = true; };
  inp.value = '';
  pp.querySelector = (s) => (s === '.nw-pt > span:nth-of-type(2)' ? lead : s === '.nw-qi' ? inp : null);
  el.appendChild = (c) => { el.children.push(c); };
  el.querySelector = (s) => {
    if (!el.children.includes(pp)) return null;
    if (s === '.nw-pp.qc') return pp;
    if (s === '.nw-pp.qc .nw-qi') return inp;
    if (s === '.nw-pp.qc .nw-dots') return dots;
    return null;
  };
  return { el, pp, lead, inp, dots };
}

test('ask: panel liczbowy – pin, napis, pointerdown nie budzi, klawisze i zamknięcie', () => {
  const { Q, tl } = env();
  const d = fakeDom(), sent = [];
  Q.exec = (w, i, code) => sent.push([i, code]);
  Q.timer = () => {};
  const w = { el: d.el, locked: false, hass: {}, padEl: (nm, lk) => { w.padArgs = [nm, lk]; return d.pp; } };
  d.pp.querySelector = (s) => (s === '.nw-pt > span:nth-of-type(2)' ? d.lead : null);
  Q.ask(w, 1, { e: 'alarm_control_panel.d', n: 'Dom' }, 'number');
  assert.deepEqual(w.padArgs, ['Dom', 'wallqa.cancel']);
  assert.equal(d.lead.textContent, 'wallqa.enter_code');
  assert.ok(d.pp.classList.contains('qc'));
  assert.ok(d.el.classList.contains('pin'));
  assert.match(d.pp.html, /data-k="ok"/);
  let stopped = 0, prevented = 0;
  const down = (k) => d.pp.L.pointerdown({ stopPropagation: () => stopped++, preventDefault: () => prevented++, target: { closest: () => (k ? { dataset: { k } } : null) } });
  down(null);
  assert.equal(stopped, 1); assert.equal(prevented, 0);
  down('4'); down('2');
  assert.equal(Q._c.buf, '42');
  assert.equal(d.dots.innerHTML.split('class="on"').length - 1, 2);
  assert.equal(d.dots.attrs['aria-label'], 'wall.pin_entered');
  assert.deepEqual(tl.filter((x) => x[0] === 'wall.pin_entered').pop()[1], { count: 2, total: 4 });
  down('del');
  assert.equal(Q._c.buf, '4');
  down('lock');
  assert.equal(Q._c, null);
  assert.equal(d.el.classList.contains('pin'), false);
  assert.equal(d.el.children.length, 0);
  assert.equal(sent.length, 0);
  assert.equal(d.el.focused, 1);
});

test('ask: panel tekstowy – Enter wysyła, Escape anuluje, klawisze nie propagują do saver', () => {
  const { Q } = env();
  const d = fakeDom(), sent = [];
  Q.exec = (w, i, code) => sent.push([i, code]);
  Q.timer = () => {};
  const w = { el: d.el, locked: false, hass: {} };
  Q.textPanel = () => d.pp;
  Q.ask(w, 0, { e: 'alarm_control_panel.d' }, 'text');
  assert.ok(d.inp.focused);
  const k = (key) => { const e = { key, stopPropagation() { this.s = 1; }, preventDefault() {} }; d.inp.L.keydown(e); return e; };
  d.inp.value = 'Sekret1';
  assert.equal(k('a').s, 1);
  assert.equal(sent.length, 0);
  k('Enter');
  assert.deepEqual(sent, [[0, 'Sekret1']]);
  assert.equal(Q._c, null);
  Q.ask(w, 0, { e: 'alarm_control_panel.d' }, 'text');
  d.inp.value = 'x';
  k('Escape');
  assert.equal(sent.length, 1);
  assert.equal(Q._c, null);
});

test('ask: zablokowany saver albo brak el – bez panelu', () => {
  const { Q } = env();
  const d = fakeDom();
  Q.ask({ el: d.el, locked: true, padEl: () => d.pp, hass: {} }, 0, { e: 'alarm_control_panel.d' }, 'number');
  assert.equal(Q._c == null, true);
  assert.equal(d.el.children.length, 0);
  assert.doesNotThrow(() => Q.ask({ el: null, locked: false }, 0, { e: 'alarm_control_panel.d' }, 'number'));
});

test('kod alarmu: nigdzie poza this._c.buf (źródło nie zapisuje kodu)', () => {
  const s = readFileSync(new URL('../../src/parts/hg-wallqa.part.js', import.meta.url), 'utf8');
  assert.doesNotMatch(s, /localStorage|sessionStorage|console\.|dataset\.(buf|code)|data-(code|buf)/);
});

test('textPanel: pole kodu nie jest zapamiętywane ani poprawiane przez przeglądarkę', () => {
  const pp = { setAttribute() {}, classList: { add() {} } };
  const { HGWallQA } = loadParts(['hg-wallqa.part.js'], { window: {}, document: { createElement: () => pp }, H: { esc: (x) => String(x), icon: String }, hgT: (k) => k, K: () => '', HGWall: {}, setTimeout, clearTimeout }, ['HGWallQA']);
  HGWallQA.textPanel('Dom');
  assert.match(pp.innerHTML, /type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false"/);
});

test('edit: dodawanie, usuwanie i zmiana akcji idą przez norm (limit 3)', () => {
  const { Q } = env();
  let cfg = [], looks = 0;
  const wall = { get: () => ({ qa: cfg }), set: (p) => { cfg = p.qa; }, admin: () => true };
  Q.wall = () => wall;
  const p = { _eLook() { looks++; }, _eToast() {} };
  Q.edit(p, (L) => L.push({ e: 'cover.g', a: 'open', ic: '', n: '', hold: true }));
  assert.equal(cfg.length, 1);
  Q.edit(p, (L) => { L[0].a = 'close'; });
  assert.equal(cfg[0].a, 'close');
  Q.edit(p, (L) => L.push({ e: 'lock.x', a: 'toggle' }));
  assert.equal(cfg.length, 1);
  Q.edit(p, (L) => L.splice(0, 1));
  assert.equal(cfg.length, 0);
  assert.equal(looks, 4);
});

test('act: obsługuje wyłącznie wl-qa-*', () => {
  const { Q } = env();
  assert.equal(Q.act({}, {}, 'wl-test'), false);
  assert.equal(Q.act({}, {}, undefined), false);
});

test('act: usuń, zmiana akcji (tylko dozwolonej) i przytrzymanie; nie-admin nic nie zmienia', () => {
  const { Q } = env();
  let cfg = Q.norm([{ e: 'cover.g', a: 'open' }, { e: 'switch.s', a: 'toggle' }]), admin = true;
  Q.wall = () => ({ get: () => ({ qa: cfg }), set: (p) => { cfg = p.qa; }, admin: () => admin });
  const p = { _eLook() {} };
  const b = (i, v) => ({ dataset: { i: String(i), v } });
  assert.equal(Q.act(p, b(0, 'close'), 'wl-qa-act'), true);
  assert.equal(cfg[0].a, 'close');
  Q.act(p, b(0, 'arm_away'), 'wl-qa-act');
  assert.equal(cfg[0].a, 'close');
  Q.act(p, b(1), 'wl-qa-hold');
  assert.equal(cfg[1].hold, true);
  admin = false;
  assert.equal(Q.act(p, b(0), 'wl-qa-del'), false);
  assert.equal(cfg.length, 2);
  admin = true;
  Q.act(p, b(0), 'wl-qa-del');
  assert.deepEqual(cfg.map((x) => x.e), ['switch.s']);
});

test('html: tylko admin; wiersze, liczba kolumn akcji, pole dodawania znika przy limicie', () => {
  const { Q } = env();
  let cfg = [], admin = false;
  Q.wall = () => ({ get: () => ({ qa: cfg }), admin: () => admin });
  const p = { _hass: { states: { 'cover.g': st('closed', { friendly_name: 'Brama' }), 'lock.x': st('locked'), 'switch.a': st('on') } } };
  assert.equal(Q.html(p), '');
  admin = true;
  let h = Q.html(p);
  assert.match(h, /wl-qa-add/);
  assert.match(h, /<option value="cover\.g">Brama<\/option>/);
  assert.doesNotMatch(h, /lock\.x/);
  cfg = Q.norm([{ e: 'cover.g', a: 'open' }]);
  h = Q.html(p);
  assert.match(h, /class="wl-seg" role="group" style="--n:3"/);
  assert.match(h, /data-hge="wl-qa-act" data-i="0" data-v="close" aria-pressed="false"/);
  assert.match(h, /data-hge="wl-qa-act" data-i="0" data-v="open" aria-pressed="true"/);
  cfg = Q.norm([{ e: 'switch.a', a: 'on' }, { e: 'switch.a', a: 'off' }, { e: 'switch.a', a: 'toggle' }]);
  assert.doesNotMatch(Q.html(p), /wl-qa-add/);
});

test('wire: dodawanie encji (obsługiwana / nie), nazwa i ikona przez norm', () => {
  const { Q } = env();
  let cfg = [];
  Q.wall = () => ({ get: () => ({ qa: cfg }), set: (x) => { cfg = x.qa; }, admin: () => true });
  const toasts = [];
  const p = { _eLook() {}, _eToast: (t) => toasts.push(t) };
  const mk = (extra) => { const o = Object.assign({ L: {}, dataset: {}, addEventListener(t, f) { o.L[t] = f; } }, extra); return o; };
  const add = mk({ value: ' Cover.G ' }), nm = mk({ dataset: { i: '0' }, value: '  Brama  ' }), ic = mk({ dataset: { i: '0' }, value: 'mdi:gate' });
  const S = { querySelector: (s) => (s === '[name=wl-qa-add]' ? add : null), querySelectorAll: (s) => (s === '[name=wl-qa-n]' ? [nm] : s === '[name=wl-qa-ic]' ? [ic] : []) };
  Q.wire(p, S);
  add.L.change();
  assert.deepEqual(cfg, [{ e: 'cover.g', a: 'open', ic: '', n: '', hold: true }]);
  add.value = 'lock.x'; add.L.change();
  assert.equal(add.value, '');
  assert.deepEqual(toasts, ['wallqa.unsupported']);
  assert.equal(cfg.length, 1);
  nm.L.change();
  assert.equal(cfg[0].n, 'Brama');
  ic.L.change();
  assert.equal(cfg[0].ic, 'mdi:gate');
  ic.value = 'zle'; ic.L.change();
  assert.equal(cfg[0].ic, 'mdi:gate');
  assert.equal(toasts[1], 'wallqa.icon_invalid');
  let enter = 0;
  add.value = 'switch.a'; add.L.keydown({ key: 'Enter', preventDefault() { enter++; } });
  assert.equal(enter, 1);
  assert.equal(cfg.length, 2);
});

test('integracja: hg-wall deleguje html/wire/act do HGWallQA, data-hge zaczyna się od wl-', () => {
  const s = readFileSync(new URL('../../src/parts/hg-wall.part.js', import.meta.url), 'utf8');
  assert.match(s, /HGWallQA\.html\(p\)/);
  assert.match(s, /HGWallQA\.wire\(p, S\)/);
  assert.match(s, /HGWallQA\.act\(p, b, a\)/);
  const q = readFileSync(new URL('../../src/parts/hg-wallqa.part.js', import.meta.url), 'utf8');
  for (const m of q.matchAll(/data-hge="([^"]+)"/g)) assert.match(m[1], /^wl-/);
});
