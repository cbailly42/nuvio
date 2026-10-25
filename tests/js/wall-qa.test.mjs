/* Szybkie przyciski na wygaszaczu (#49): walidacja, biała lista akcji, kod alarmu, przytrzymanie. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadParts } from './harness.mjs';

function env() {
  const calls = [], ev = {};
  const H = {
    call: (h, d, s, data) => { calls.push([d, s, data]); return H.fail ? Promise.reject(new Error('x')) : Promise.resolve(); },
    haptic: () => {}, icon: (i) => `<i ${i}>`, esc: (s) => String(s), name: (h, e, fb) => fb, fail: false,
  };
  const window = { addEventListener: (t, f) => { ev[t] = f; }, removeEventListener: (t) => { delete ev[t]; } };
  const globals = { window, document: {}, H, hgT: (k) => k, K: (r, g, b, a) => `rgba(${r},${g},${b},${a})`, HGWall: {}, setTimeout, clearTimeout };
  const { HGWallQA } = loadParts(['hg-wallqa.part.js'], globals, ['HGWallQA']);
  return { Q: HGWallQA, calls, ev, H };
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

test('integracja: hg-wall ma zaczepy HGWallQA (get/wk/show/tick/lockNow)', () => {
  const s = readFileSync(new URL('../../src/parts/hg-wall.part.js', import.meta.url), 'utf8');
  assert.match(s, /qa: typeof HGWallQA !== 'undefined' \? HGWallQA\.norm\(/);
  assert.match(s, /qaTap\(e\)/);
  assert.match(s, /this\.qaTap\(e\)/);
  assert.match(s, /HGWallQA\.mount\(this, el\)/);
  assert.match(s, /HGWallQA\.paint\(this\)/);
  assert.match(s, /HGWallQA\.close\(this\)/);
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
