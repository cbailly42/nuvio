/* 2.21.1 (PR #22): hgClimAct works out what a climate entity really does:
   actual state entity > hvac_action > mode (2.21.2: no setpoint guess). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const src = readFileSync(new URL('../../src/parts/shared/climate-modes.part.js', import.meta.url), 'utf8');
const load = (stateEnt) => {
  const ctx = { hgT: (k) => k, HGAreas: { stateOf: () => stateEnt || null } };
  vm.createContext(ctx); vm.runInContext(src + '\nthis.act = hgClimAct; this.on = hgOnState;', ctx); return ctx;
};
const cl = (state, attributes = {}) => ({ entity_id: 'climate.x', state, attributes });

test('off and unavailable give null', () => {
  const { act } = load();
  for (const s of ['off', 'unavailable', 'unknown']) assert.equal(act({ states: {} }, cl(s)), null);
});
test('hvac_action wins over the mode', () => {
  const { act } = load();
  assert.equal(act({ states: {} }, cl('heat', { hvac_action: 'idle' })), 'idle');
  assert.equal(act({ states: {} }, cl('heat', { hvac_action: 'heating' })), 'heat');
  assert.equal(act({ states: {} }, cl('auto', { hvac_action: 'cooling' })), 'cool');
});
test('without hvac_action and without an actual state entity the mode decides, not the setpoint', () => {
  const { act } = load();
  // IR remote air conditioners (e.g. Tuya): no hvac_action, current_temperature measured next to the remote
  assert.equal(act({ states: {} }, cl('heat', { current_temperature: 27.5, temperature: 25 })), 'heat');
  assert.equal(act({ states: {} }, cl('heat', { current_temperature: 21, temperature: 7 })), 'heat');
  assert.equal(act({ states: {} }, cl('heat', { current_temperature: 18, temperature: 21 })), 'heat');
  assert.equal(act({ states: {} }, cl('cool', { current_temperature: 22, temperature: 24 })), 'cool');
  assert.equal(act({ states: {} }, cl('auto', {})), 'auto');
});
test('with an actual state entity a device without hvac_action can still be idle', () => {
  const { act } = load('binary_sensor.burn');
  assert.equal(act({ states: { 'binary_sensor.burn': { state: 'off' } } }, cl('heat', { current_temperature: 18, temperature: 21 })), 'idle');
});
test('the actual state entity overrides everything, text and unavailable fall through', () => {
  const h = (v) => ({ states: { 'sensor.p': { state: v } } });
  const { act } = load('sensor.p');
  assert.equal(act(h('off'), cl('heat', { hvac_action: 'heating' })), 'idle');
  assert.equal(act(h('on'), cl('heat', { hvac_action: 'idle' })), 'heat');
  assert.equal(act(h('0'), cl('heat', { hvac_action: 'heating' })), 'idle');
  assert.equal(act(h('3.5'), cl('heat', { hvac_action: 'idle' })), 'heat');
  assert.equal(act(h('unavailable'), cl('heat', { hvac_action: 'heating' })), 'heat');
  assert.equal(act(h('burning'), cl('heat', { hvac_action: 'idle' })), 'idle');
});
test('an optimistic mode change returns the new mode', () => {
  const { act } = load();
  assert.equal(act({ states: {} }, cl('heat', { hvac_action: 'idle' }), 'cool'), 'cool');
});
