/* --- czujniki: automatyczne wykrywanie (reguły w CFG['security'] w build.py, opis w README) --- */
/* [kategoria, ikona wł., ikona wył., stan wł. (hgTLazy), stan wył. (hgTLazy)] */
const HG_SENS = {
  motion: ['ruch', 'mdi:motion-sensor', 'mdi:motion-sensor-off', hgTLazy('cards.sensors.states.motion.on'), hgTLazy('cards.sensors.states.motion.off')], occupancy: ['ruch', 'mdi:account-eye', 'mdi:account-outline', hgTLazy('cards.sensors.states.occupancy.on'), hgTLazy('cards.sensors.states.occupancy.off')],
  presence: ['ruch', 'mdi:account-eye', 'mdi:account-outline', hgTLazy('cards.sensors.states.presence.on'), hgTLazy('cards.sensors.states.presence.off')], door: ['otw', 'mdi:door-open', 'mdi:door-closed', hgTLazy('cards.sensors.states.door.on'), hgTLazy('cards.sensors.states.door.off')],
  window: ['otw', 'mdi:window-open-variant', 'mdi:window-closed-variant', hgTLazy('cards.sensors.states.window.on'), hgTLazy('cards.sensors.states.window.off')], opening: ['otw', 'mdi:square-rounded-outline', 'mdi:square-rounded', hgTLazy('cards.sensors.states.opening.on'), hgTLazy('cards.sensors.states.opening.off')],
  garage_door: ['otw', 'mdi:garage-open-variant', 'mdi:garage-variant', hgTLazy('cards.sensors.states.garage_door.on'), hgTLazy('cards.sensors.states.garage_door.off')], smoke: ['inne', 'mdi:smoke-detector-variant-alert', 'mdi:smoke-detector-variant', hgTLazy('cards.sensors.states.smoke.on'), hgTLazy('cards.sensors.states.smoke.off')],
  gas: ['inne', 'mdi:meter-gas', 'mdi:meter-gas-outline', hgTLazy('cards.sensors.states.gas.on'), hgTLazy('cards.sensors.states.gas.off')], moisture: ['inne', 'mdi:water-alert', 'mdi:water-off-outline', hgTLazy('cards.sensors.states.moisture.on'), hgTLazy('cards.sensors.states.moisture.off')],
  tamper: ['inne', 'mdi:shield-alert', 'mdi:shield-check-outline', hgTLazy('cards.sensors.states.tamper.on'), hgTLazy('cards.sensors.states.tamper.off')], vibration: ['inne', 'mdi:vibrate', 'mdi:vibrate-off', hgTLazy('cards.sensors.states.vibration.on'), hgTLazy('cards.sensors.states.vibration.off')],
};
const HG_SENS_TABS = [['all', hgTLazy('cards.sensors.tabs.all')], ['ruch', hgTLazy('cards.sensors.tabs.motion')], ['otw', hgTLazy('cards.sensors.tabs.openings')], ['inne', hgTLazy('cards.sensors.tabs.other')]];
class HGSensorsCard extends HGBase {
  defaults() {
    return { title: hgT('cards.sensors.sensors'), icon: 'mdi:motion-sensor', device_classes: Object.keys(HG_SENS), exclude_platforms: ['browser_mod', 'mobile_app', 'group'],
      exclude: [], include: [], names: {}, name_strip: [' Zajętość', ' occupancy'], extras: true };
  }
  _extraSig() { return [this._tab || 'all', !!this._showUn, Math.floor(Date.now() / 60000), this._disc && this._disc.key]; }
  /* wykrywanie tylko gdy zmieni się liczba encji lub rejestr (nie przy każdym hass) */
  _discover() {
    const h = this._hass, c = this._config;
    if (this._disc && this._disc.st === h.states && this._disc.ent === h.entities) return this._disc;   // te same obiekty -> bez liczenia
    const key = hgNKeys(h.states) + ':' + (h.entities ? hgNKeys(h.entities) : 0);
    if (this._disc && this._disc.key === key && this._disc.ent === h.entities) { this._disc.st = h.states; return this._disc; }
    const reg = h.entities || {}, dev = h.devices || {};
    const exc = c.exclude.map(hgGlob), inc = c.include.map(hgGlob);
    const list = [];
    for (const e of Object.keys(h.states)) {
      if (!e.startsWith('binary_sensor.')) continue;
      const s = h.states[e], dc = s.attributes.device_class, r = reg[e] || {};
      const forced = inc.some((x) => x.test(e));
      if (!forced) {
        if (!c.device_classes.includes(dc)) continue;
        if (r.hidden || r.entity_category) continue;                       // ukryte, diagnostyczne, konfiguracyjne
        if (c.exclude_platforms.includes(r.platform)) continue;            // przeglądarki, telefony, grupy-agregaty
        if (exc.some((x) => x.test(e))) continue;
      } else if (exc.some((x) => x.test(e)) && !c.include.includes(e)) continue;
      const area = r.area_id || (r.device_id && dev[r.device_id] && dev[r.device_id].area_id);
      list.push({ e, dc: HG_SENS[dc] ? dc : 'motion', dev: r.device_id, area: area && h.areas && h.areas[area] ? h.areas[area].name : null });
    }
    // dodatki: natężenie światła z tego samego urządzenia (np. czujnik obecności mmWave Sonoff: sensor.*_illumination)
    if (c.extras) {
      const byDev = {};
      for (const [id, r] of Object.entries(reg)) {
        if (!r.device_id || !id.startsWith('sensor.') || r.hidden) continue;
        const st = h.states[id]; if (!st) continue;
        if (st.attributes.device_class === 'illuminance' || /illumin/.test(id)) (byDev[r.device_id] = byDev[r.device_id] || []).push(id);
      }
      for (const x of list) if (x.dev && byDev[x.dev]) x.lux = byDev[x.dev][0];
    }
    this._entsC = null;
    return (this._disc = { key, ent: h.entities, st: h.states, list });
  }
  ents() { if (!this._hass) return []; return this._discover().list.flatMap((x) => (x.lux ? [x.e, x.lux] : [x.e])); }
  _changed() { const k = this._disc && this._disc.key; this._discover(); if (this._disc.key !== k) { this._entsC = null; this._prevStates = null; } return super._changed(); }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; gap:var(--s1); padding:var(--s3) var(--s3); overflow:auto; }
.sum{ display:flex; flex-wrap:wrap; gap:var(--s1); }
.sum span{ display:inline-flex; align-items:center; gap:5u; height:22u; padding:0 var(--s1); border-radius:var(--r-sm); background:rgba(255,255,255,.65); font-size:var(--fs-sm); color:#4A4E54; }
.sum span b{ font-weight:600; color:#1E2023; } .sum .a b{ color:var(--hg-accent-tx); } .sum .o b{ color:var(--hg-accent-tx); }
.tabs{ display:flex; gap:4u; padding:3u; border-radius:var(--r-md); background:rgba(255,255,255,.45); align-self:flex-start; flex-wrap:nowrap; max-width:100%; overflow-x:auto; scrollbar-width:none; flex:none; }
.tb{ position:relative; height:max(calc(var(--k) * 26), var(--hg-tgt, 0px)); padding:0 var(--s2); border-radius:var(--r-sm); font-size:var(--fs-sm); color:#4A4E54; transition:background .2s, color .2s; flex:none; white-space:nowrap; }
.tb.sel{ background:#fff; color:#1E2023; box-shadow:var(--hg-sh-sm); } .tb i{ font-style:normal; color:inherit; opacity:1; font-weight:600; margin-left:3u; }
.grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(max(calc(var(--k) * 148), 10.5em), 1fr)); gap:var(--s1); }
.t{ position:relative; display:flex; align-items:center; gap:var(--s1); padding:var(--s1) var(--s2); border-radius:var(--r-sm); text-align:left; min-height:max(calc(var(--k) * 48), var(--hg-tgt, 0px));
  background:var(--hg-inner-bg); border:0; box-shadow:var(--hg-inner-hi); transition:background .2s; min-width:0; }
.t .ic{ position:relative; width:28u; height:28u; border-radius:var(--r-sm); flex:none; display:flex; align-items:center; justify-content:center; background:#ECEDEE; color:#5A5E64; }
.t .ic ha-icon{ width:15u; height:15u; }
.t.on .ic{ background:var(--hg-accent); color:var(--hg-on-accent); }
.t.on.otw .ic{ background:var(--hg-accent); }
.t.on.inne .ic{ background:#E53935; }
.t.on .ic::after{ content:''; position:absolute; inset:0; border-radius:inherit; border:2u solid currentColor; color:inherit; background:none; animation:var(--hg-loop, hgsring 1.8s cubic-bezier(.2,.8,.2,1) infinite); }
.t.on .ic::after{ border-color:var(--hg-accent); } .t.on.otw .ic::after{ border-color:var(--hg-accent); } .t.on.inne .ic::after{ border-color:#E53935; }
@keyframes hgsring{ 0%{ transform:scale(1); opacity:.6 } 100%{ transform:scale(1.55); opacity:0 } }
.t .tx{ min-width:0; flex:1; display:flex; flex-direction:column; gap:2u; }
.t b{ font-size:var(--fs-sm); font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.t span{ font-size:var(--fs-xs); color:#6A6E74; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.t span em{ font-style:normal; font-weight:600; color:#2A2D31; } .t.on span em{ color:var(--hg-alert-tx); }
.t.un{ opacity:.6; } .t.un .ic{ background:#E4E5E7; color:#9AA0A6; }
.sec{ display:flex; align-items:center; gap:var(--s1); font-size:var(--fs-xs); color:#6A6E74; text-transform:uppercase; letter-spacing:.06em; margin-top:4u; }
.sec button{ position:relative; text-transform:none; letter-spacing:0; font-size:var(--fs-sm); color:#2A2D31; padding:3u var(--s1); border-radius:var(--r-sm); background:rgba(255,255,255,.6); min-height:var(--hg-tgt, 0px); }
.none{ font-size:var(--fs-sm); color:#6A6E74; padding:var(--s1) 2u; }
@media (max-width:600px){ .grid{ grid-template-columns:minmax(0, 1fr); } }
`);
  }
  _nm(e) {
    const c = this._config; if (c.names[e]) return c.names[e];
    let n = H.name(this._hass, e, e);
    for (const x of c.name_strip) if (n.endsWith(x)) n = n.slice(0, -x.length);
    return n.replace(/^(.*?) Czujnik drzwi Drzwi$/, '$1 · drzwi').replace(/ Drzwi$/, '');
  }
  render() {
    const h = this._hass, c = this._config, list = this._discover().list;
    const it = list.map((x) => { const s = H.st(h, x.e); return { ...x, s, un: !H.ok(s), on: s && s.state === 'on', cat: HG_SENS[x.dc][0], t: s ? new Date(s.last_changed).getTime() : 0 }; });
    const act = it.filter((x) => x.on), opn = act.filter((x) => x.cat === 'otw').length, mot = act.filter((x) => x.cat === 'ruch').length, alr = act.filter((x) => x.cat === 'inne').length;
    const unN = it.filter((x) => x.un).length;
    const cnt = (k) => it.filter((x) => k === 'all' || x.cat === k).length;
    const tab = this._tab || 'all';
    const sel = it.filter((x) => tab === 'all' || x.cat === tab).sort((a, b) => (b.on - a.on) || (a.un - b.un) || (b.t - a.t));
    const tile = (x) => {
      const d = HG_SENS[x.dc], lux = x.lux && H.st(h, x.lux);
      const luxT = lux && H.ok(lux) ? ({ bright: hgT('cards.sensors.bright'), dim: hgT('cards.sensors.dim'), dark: hgT('cards.sensors.dark') }[lux.state] || `${H.fmt(lux.state, 0)} ${lux.attributes.unit_of_measurement || ''}`.trim()) : '';
      const st = x.un ? hgT('common.unavailable_masc') : x.on ? String(d[3]) : String(d[4]);
      const sub = [`<em>${H.esc(st)}</em>`, x.s && !x.un ? hgRel(new Date(x.s.last_changed)) : '', x.area ? H.esc(x.area) : '', luxT ? H.esc(luxT) : ''].filter(Boolean).join(' · ');
      return `<button class="t lift ${x.cat} ${x.on ? 'on' : ''} ${x.un ? 'un' : ''}" data-act="more" data-e="${H.esc(x.e)}" title="${H.esc(this._nm(x.e))} – ${hgT('cards.sensors.history')}" aria-label="${H.esc(this._nm(x.e))}: ${H.esc(st)}">
        <span class="ic">${H.icon(x.on ? d[1] : d[2])}</span><span class="tx"><b>${H.esc(this._nm(x.e))}</b><span>${sub}</span></span></button>`;
    };
    const ok = sel.filter((x) => !x.un), un = sel.filter((x) => x.un);
    const sum = [`<span class="a"><b>${act.length}</b> ${hgT('cards.sensors.active_label', { count: act.length })}</span>`, mot ? `<span><b>${mot}</b> ${hgT('common.state_motion')}</span>` : '',
      `<span class="o"><b>${opn}</b> ${hgT('cards.sensors.open_label', { count: opn })}</span>`, alr ? `<span class="a"><b>${alr}</b> ${hgT('cards.sensors.alarm_label')}</span>` : '',
      unN ? `<span><b>${unN}</b> ${hgT('cards.sensors.unavailable')}</span>` : ''].join('');
    const tabs = HG_SENS_TABS.filter(([k]) => k === 'all' || cnt(k)).map(([k, l]) => `<button class="tb ${tab === k ? 'sel' : ''}" data-act="tab" data-k="${k}" aria-pressed="${tab === k}">${l}<i>${cnt(k)}</i></button>`).join('');
    return `<ha-card class="glass"><div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span></div>
      <div class="sum">${sum}</div><div class="tabs" role="toolbar" aria-label="${hgT('cards.sensors.sensor_filter')}">${tabs}</div>
      ${ok.length ? `<div class="grid">${ok.map(tile).join('')}</div>` : `<div class="none">${hgT('cards.sensors.no_available_sensors_in')}</div>`}
      ${un.length ? `<div class="sec">${hgT('common.unavailable')} · ${un.length}<button data-act="unv" aria-expanded="${!!this._showUn}">${this._showUn ? hgT('common.hide') : hgT('cards.sensors.show')}</button></div>${this._showUn ? `<div class="grid">${un.map(tile).join('')}</div>` : ''}` : ''}
    </ha-card>`;
  }
  onAct(a, t) {
    if (a === 'more') return H.fire(this, 'hass-more-info', { entityId: t.dataset.e });
    if (a === 'tab') { this._tab = t.dataset.k; return this.rerender(); }
    if (a === 'unv') { this._showUn = !this._showUn; return this.rerender(); }
  }
  getCardSize() { return 8; }
}
hgReg('hg-sensors-card', HGSensorsCard, hgTLazy('cards.sensors.picker_name'), hgTLazy('cards.sensors.picker_description'));
