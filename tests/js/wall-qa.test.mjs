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
