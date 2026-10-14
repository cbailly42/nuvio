/* ===================== BEZPIECZEŃSTWO: alarm + czujniki ===================== */
/* [etykieta PL, kolor, ikona, etykieta EN] */
const HG_ALARM_ST = {
  disarmed: ['Rozbrojony', 'var(--hg-accent)', 'mdi:shield-off-outline', 'Disarmed'], armed_home: ['Uzbrojony · w domu', 'var(--hg-accent)', 'mdi:shield-home', 'Armed · home'],
  armed_away: ['Uzbrojony · poza domem', 'var(--hg-accent)', 'mdi:shield-lock', 'Armed · away'], armed_night: ['Uzbrojony · noc', 'var(--hg-accent)', 'mdi:shield-moon', 'Armed · night'],
  armed_vacation: ['Uzbrojony · urlop', 'var(--hg-accent)', 'mdi:shield-airplane', 'Armed · vacation'], armed_custom_bypass: ['Uzbrojony · własny', 'var(--hg-accent)', 'mdi:shield-edit', 'Armed · custom'],
  arming: ['Uzbrajanie…', 'var(--hg-accent)', 'mdi:shield-sync', 'Arming…'], pending: ['Oczekuje…', 'var(--hg-accent)', 'mdi:shield-alert-outline', 'Pending…'],
  disarming: ['Rozbrajanie…', 'var(--hg-accent)', 'mdi:shield-sync', 'Disarming…'], triggered: ['Alarm!', '#E53935', 'mdi:bell-ring', 'Triggered!'],
  unavailable: ['Niedostępny', '#9AA0A6', 'mdi:shield-remove-outline', 'Unavailable'], unknown: ['Nieznany', '#9AA0A6', 'mdi:shield-remove-outline', 'Unknown'],
};
/* supported_features (AlarmControlPanelEntityFeature): 1 ARM_HOME, 2 ARM_AWAY, 4 ARM_NIGHT, 8 TRIGGER (bez przycisku), 16 ARM_CUSTOM_BYPASS, 32 ARM_VACATION */
/* [bit, tryb, etykieta PL, ikona, stan, etykieta EN]; etykieta w bieżącym języku: hgAlarmLbl(a) */
const HG_ALARM_ACT = [[1, 'arm_home', 'W domu', 'mdi:home-lock', 'armed_home', 'Home'], [2, 'arm_away', 'Poza domem', 'mdi:lock', 'armed_away', 'Away'],
  [4, 'arm_night', 'Noc', 'mdi:weather-night', 'armed_night', 'Night'], [32, 'arm_vacation', 'Urlop', 'mdi:airplane', 'armed_vacation', 'Vacation'],
  [16, 'arm_custom_bypass', 'Własny', 'mdi:shield-edit-outline', 'armed_custom_bypass', 'Custom']];
const hgAlarmLbl = (a) => hgTr(a[2], a[5]);
class HGAlarmCard extends HGBase {
  defaults() { return { title: 'Alarm', icon: 'mdi:shield-home-outline', name: hgTr('Alarm · Dom', 'Alarm · Home') }; }
  _extraSig() { return [this._pend || '', (this._code || '').length, Math.floor(Date.now() / 60000)]; }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; gap:var(--s2); padding:var(--s3) var(--s3); overflow:auto; }
.big{ display:flex; align-items:center; gap:var(--s3); padding:4u 0; }
.ring{ position:relative; width:clamp(56px, calc(var(--k) * 46), 64px); height:clamp(56px, calc(var(--k) * 46), 64px); border-radius:50%; flex:none; display:flex; align-items:center; justify-content:center; color:#fff;
  background:var(--c); box-shadow:var(--hg-sh); }
.ring ha-icon{ width:28px; height:28px; --mdc-icon-size:28px; }
.ring::before, .ring::after{ content:''; position:absolute; inset:-6u; border-radius:50%; border:2u solid var(--c); opacity:0; pointer-events:none; }
.anim .ring::before{ animation:hgring 1.6s cubic-bezier(.2,.8,.2,1) infinite; }
.anim .ring::after{ animation:hgring 1.6s cubic-bezier(.2,.8,.2,1) .8s infinite; }
.trig .ring{ animation:hgpulse 1s infinite; }
@keyframes hgring{ 0%{ transform:scale(.9); opacity:.7 } 100%{ transform:scale(1.45); opacity:0 } }
.st{ min-width:0; } .st b{ display:block; font-size:clamp(20px, calc(var(--k) * 17), 24px); font-weight:600; letter-spacing:-.01em; color:#1E2023; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.st span{ display:block; font-size:var(--fs-sm); color:#5A5E64; margin-top:3u; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.acts{ display:grid; grid-template-columns:repeat(auto-fit, minmax(min(120px, 100%), 1fr)); gap:var(--s1); }
.ab{ position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; min-width:0; min-height:max(64px, var(--hg-tgt, 0px)); padding:var(--s1) var(--s1); border-radius:var(--r-sm); font-size:var(--fs-sm); font-weight:400;
  background:var(--hg-inner-bg); border:0; box-shadow:var(--hg-inner-hi); color:#2A2D31; transition:background .2s, transform .15s; text-align:center; }
.ab ha-icon{ width:22px; height:22px; --mdc-icon-size:22px; flex:none; } .ab span{ max-width:100%; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .ab:hover{ background:var(--hg-inner-bg-h); } .ab:active{ transform:scale(.97); }
.ab.sel{ background:var(--c, var(--hg-accent)); color:#fff; border-color:transparent; }
.ab.dis{ grid-column:1 / -1; flex-direction:row; min-height:max(48px, var(--hg-tgt, 0px)); gap:var(--s1); background:#1F2125; color:#fff; border-color:#1F2125; }
.kp{ display:flex; flex-direction:column; gap:var(--s1); padding:var(--s2); border-radius:var(--r-md); background:rgba(255,255,255,.5); }
.kp .q{ display:flex; align-items:center; justify-content:space-between; font-size:var(--fs-sm); color:#4A4E54; }
.dots{ display:flex; gap:var(--s1); justify-content:center; min-height:12u; }
.dots i{ width:9u; height:9u; border-radius:50%; background:#2A2D31; }
.dots em{ font-style:normal; font-size:var(--fs-sm); color:#8A8E94; }
.keys{ display:grid; grid-template-columns:repeat(3, 1fr); gap:var(--s1); }
.k{ position:relative; min-height:max(calc(var(--k) * 34), var(--hg-tgt, 0px)); border-radius:var(--r-sm); background:rgba(255,255,255,.75); font-size:var(--fs-md); font-weight:400; display:flex; align-items:center; justify-content:center; }
.k:active{ background:#fff; transform:scale(.96); } .k ha-icon{ width:16u; height:16u; }
.k.ok{ background:var(--hg-accent); color:var(--hg-on-accent); } .k.ok[disabled]{ opacity:.45; }
.pw{ height:max(calc(var(--k) * 34), var(--hg-tgt, 0px)); border-radius:var(--r-sm); border:1px solid rgba(0,0,0,.1); padding:0 var(--s2); font:inherit; font-size:var(--fs-md); background:#fff; }
.x{ font-size:var(--fs-sm); color:#5A5E64; padding:4u var(--s1); border-radius:var(--r-sm); position:relative; min-height:var(--hg-tgt, 0px); }
`);
  }
  _needCode(act) { const a = (H.st(this._hass, this._config.entity) || { attributes: {} }).attributes; return !!a.code_format && (act === 'disarm' || !!a.code_arm_required); }
  render() {
    const c = this._config, s = H.st(this._hass, c.entity);
    const stt = s ? s.state : 'unavailable', [lblPl, col, ic, lblEn] = HG_ALARM_ST[stt] || [H.stateLabel(stt), 'var(--hg-accent)', 'mdi:shield'], lbl = lblEn ? hgTr(lblPl, lblEn) : lblPl;
    const un = !H.ok(s), feat = s ? Number(s.attributes.supported_features) || 0 : 0;
    const anim = ['arming', 'pending', 'disarming', 'triggered'].includes(stt);
    const by = s && s.attributes.changed_by ? ` · ${H.esc(s.attributes.changed_by)}` : '';
    const acts = un ? '' : HG_ALARM_ACT.filter((a) => feat & a[0]).map((a) => `<button class="ab ${stt === a[4] ? 'sel' : ''}" data-act="arm" data-m="${a[1]}" aria-pressed="${stt === a[4]}" aria-label="${hgTr('Uzbrój', 'Arm')}: ${hgAlarmLbl(a)}" title="${hgTr('Uzbrój', 'Arm')}: ${hgAlarmLbl(a)}">${H.icon(a[3])}<span>${hgAlarmLbl(a)}</span></button>`).join('')
      + (stt !== 'disarmed' ? `<button class="ab dis" data-act="arm" data-m="disarm" aria-label="${hgTr('Rozbrój', 'Disarm')}">${H.icon('mdi:shield-off-outline')}<span>${hgTr('Rozbrój', 'Disarm')}</span></button>` : '');
    let kp = '';
    if (this._pend) {
      const txt = s && s.attributes.code_format === 'text', n = (this._code || '').length;
      const nm = this._pend === 'disarm' ? hgTr('Rozbrój', 'Disarm') : hgAlarmLbl(HG_ALARM_ACT.find((a) => a[1] === this._pend) || [0, 0, 'Uzbrój', 0, 0, 'Arm']);
      kp = `<div class="kp"><div class="q"><span>${hgTr('Kod do', 'Code for')}: <b>${H.esc(nm)}</b></span><button class="x" data-act="kcancel" aria-label="${hgTr('Anuluj', 'Cancel')}">${hgTr('Anuluj', 'Cancel')}</button></div>
        ${txt ? `<input class="pw" type="password" autocomplete="off" aria-label="${hgTr('Kod alarmu', 'Alarm code')}" placeholder="${hgTr('Kod', 'Code')}">`
        : `<div class="dots" aria-live="polite">${n ? '<i></i>'.repeat(n) : `<em>${hgTr('Wpisz kod', 'Enter code')}</em>`}</div>
        <div class="keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button class="k" data-act="key" data-k="${d}" aria-label="${d}">${d}</button>`).join('')}
          <button class="k" data-act="kdel" aria-label="${hgTr('Usuń cyfrę', 'Delete digit')}">${H.icon('mdi:backspace-outline')}</button><button class="k" data-act="key" data-k="0" aria-label="0">0</button>
          <button class="k ok" data-act="kok" aria-label="${hgTr('Zatwierdź', 'Confirm')}" ${n ? '' : 'disabled'}>${H.icon('mdi:check')}</button></div>`}
        ${txt ? `<button class="k ok" data-act="kok" aria-label="${hgTr('Zatwierdź', 'Confirm')}">${H.icon('mdi:check')}</button>` : ''}</div>`;
    }
    return `<ha-card class="glass ${anim ? 'anim' : ''} ${stt === 'triggered' ? 'trig' : ''}" style="--c:${col}">
      <div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><span class="sp"></span>
        <button class="ib kebab" data-act="more" aria-label="${hgTr('Szczegóły alarmu', 'Alarm details')}" title="${hgTr('Szczegóły i historia', 'Details and history')}">${H.icon('mdi:dots-vertical')}</button></div>
      <div class="big"><div class="ring">${H.icon(ic)}</div><div class="st"><b>${H.esc(lbl)}</b>
        <span>${s ? [H.esc(c.name || s.attributes.friendly_name || c.entity), hgTr('zmiana ', 'changed ') + hgRel(new Date(s.last_changed))].filter(Boolean).join(' · ') + by : hgTr('Brak encji ', 'Entity not found: ') + H.esc(c.entity)}</span></div></div>
      ${kp || (acts ? `<div class="acts">${acts}</div>` : '')}</ha-card>`;
  }
  afterRender() { const i = this.$.querySelector('.pw'); if (i) { i.value = this._code || ''; i.oninput = () => { this._code = i.value; }; i.onkeydown = (e) => { if (e.key === 'Enter') this.onAct('kok'); };
    i.onblur = () => { if (this._pendingUpd) { this._pendingUpd = false; this._update(true); } }; } }
  /* pole kodu z fokusem: nie podmieniaj DOM (utrata fokusu/klawiatury) – przerysuj po blur */
  _doUpdate(force) { const i = this.$ && this.$.querySelector('.pw'); if (i && this.shadowRoot.activeElement === i) { this._pendingUpd = true; return; } return super._doUpdate(force); }
  _send(m, code) {
    const pw = this.$.querySelector('.pw'); if (pw) pw.blur();
    const d = { entity_id: this._config.entity }; if (code) d.code = code;
    this._pend = null; this._code = '';
    H.call(this._hass, 'alarm_control_panel', 'alarm_' + m, d);
    this.rerender();
  }
  onAct(a, t) {
    if (a === 'more') return H.fire(this, 'hass-more-info', { entityId: this._config.entity });
    if (a === 'arm') { const m = t.dataset.m; if (this._needCode(m)) { this._pend = m; this._code = ''; return this.rerender(); } return this._send(m); }
    if (a === 'key') { if ((this._code || '').length < 12) this._code = (this._code || '') + t.dataset.k; return this.rerender(); }
    if (a === 'kdel') { this._code = (this._code || '').slice(0, -1); return this.rerender(); }
    if (a === 'kcancel') { this._pend = null; this._code = ''; return this.rerender(); }
    if (a === 'kok') { if (this._pend && this._code) this._send(this._pend, this._code); }
  }
  getCardSize() { return 5; }
}
hgReg('hg-alarm-card', HGAlarmCard, 'Home Glass – Alarm', hgTr('Stan alarmu, uzbrajanie/rozbrajanie wg supported_features, klawiatura kodu', 'Alarm state, arm/disarm per supported_features, code keypad'));

/* --- czujniki: automatyczne wykrywanie (reguły w CFG['security'] w build.py, opis w README) --- */
/* [kategoria, ikona wł., ikona wył., stan wł. PL, stan wył. PL, stan wł. EN, stan wył. EN] */
const HG_SENS = {
  motion: ['ruch', 'mdi:motion-sensor', 'mdi:motion-sensor-off', 'Wykryto', 'Brak', 'Detected', 'Clear'], occupancy: ['ruch', 'mdi:account-eye', 'mdi:account-outline', 'Wykryto', 'Brak', 'Detected', 'Clear'],
  presence: ['ruch', 'mdi:account-eye', 'mdi:account-outline', 'Obecny', 'Brak', 'Present', 'Away'],
  door: ['otw', 'mdi:door-open', 'mdi:door-closed', 'Otwarte', 'Zamknięte', 'Open', 'Closed'], window: ['otw', 'mdi:window-open-variant', 'mdi:window-closed-variant', 'Otwarte', 'Zamknięte', 'Open', 'Closed'],
  opening: ['otw', 'mdi:square-rounded-outline', 'mdi:square-rounded', 'Otwarte', 'Zamknięte', 'Open', 'Closed'], garage_door: ['otw', 'mdi:garage-open-variant', 'mdi:garage-variant', 'Otwarta', 'Zamknięta', 'Open', 'Closed'],
  smoke: ['inne', 'mdi:smoke-detector-variant-alert', 'mdi:smoke-detector-variant', 'Dym!', 'OK', 'Smoke!', 'OK'], gas: ['inne', 'mdi:meter-gas', 'mdi:meter-gas-outline', 'Gaz!', 'OK', 'Gas!', 'OK'],
  moisture: ['inne', 'mdi:water-alert', 'mdi:water-off-outline', 'Zalanie!', 'Sucho', 'Leak!', 'Dry'], tamper: ['inne', 'mdi:shield-alert', 'mdi:shield-check-outline', 'Sabotaż!', 'OK', 'Tampering!', 'OK'],
  vibration: ['inne', 'mdi:vibrate', 'mdi:vibrate-off', 'Wibracje', 'Spokój', 'Vibration', 'Still'],
};
const HG_SENS_TABS = [['all', 'Wszystkie', 'All'], ['ruch', 'Ruch / obecność', 'Motion / presence'], ['otw', 'Drzwi / okna', 'Doors / windows'], ['inne', 'Inne', 'Other']];
const hgGlob = (pat) => new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
class HGSensorsCard extends HGBase {
  defaults() {
    return { title: hgTr('Czujniki', 'Sensors'), icon: 'mdi:motion-sensor', device_classes: Object.keys(HG_SENS), exclude_platforms: ['browser_mod', 'mobile_app', 'group'],
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
.t.on .ic::after{ content:''; position:absolute; inset:0; border-radius:inherit; border:2u solid currentColor; color:inherit; background:none; animation:hgsring 1.8s cubic-bezier(.2,.8,.2,1) infinite; }
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
      const luxT = lux && H.ok(lux) ? ({ bright: hgTr('jasno', 'bright'), dim: hgTr('ciemno', 'dim'), dark: hgTr('ciemno', 'dark') }[lux.state] || `${H.fmt(lux.state, 0)} ${lux.attributes.unit_of_measurement || ''}`.trim()) : '';
      const st = x.un ? hgTr('Niedostępny', 'Unavailable') : x.on ? hgTr(d[3], d[5]) : hgTr(d[4], d[6]);
      const sub = [`<em>${H.esc(st)}</em>`, x.s && !x.un ? hgRel(new Date(x.s.last_changed)) : '', x.area ? H.esc(x.area) : '', luxT ? H.esc(luxT) : ''].filter(Boolean).join(' · ');
      return `<button class="t lift ${x.cat} ${x.on ? 'on' : ''} ${x.un ? 'un' : ''}" data-act="more" data-e="${H.esc(x.e)}" title="${H.esc(this._nm(x.e))} – ${hgTr('historia', 'history')}" aria-label="${H.esc(this._nm(x.e))}: ${H.esc(st)}">
        <span class="ic">${H.icon(x.on ? d[1] : d[2])}</span><span class="tx"><b>${H.esc(this._nm(x.e))}</b><span>${sub}</span></span></button>`;
    };
    const ok = sel.filter((x) => !x.un), un = sel.filter((x) => x.un);
    const en = hgCurLang() === 'en';
    const sum = [`<span class="a"><b>${act.length}</b> ${en ? 'active' : act.length === 1 ? 'aktywny' : 'aktywne'}</span>`, mot ? `<span><b>${mot}</b> ${hgTr('ruch', 'motion')}</span>` : '',
      `<span class="o"><b>${opn}</b> ${en ? 'open' : opn === 1 || (opn > 1 && opn < 5) ? 'otwarte' : 'otwartych'}</span>`, alr ? `<span class="a"><b>${alr}</b> alarm</span>` : '',
      unN ? `<span><b>${unN}</b> ${hgTr('niedostępnych', 'unavailable')}</span>` : ''].join('');
    const tabs = HG_SENS_TABS.filter(([k]) => k === 'all' || cnt(k)).map(([k, l, le]) => `<button class="tb ${tab === k ? 'sel' : ''}" data-act="tab" data-k="${k}" aria-pressed="${tab === k}">${hgTr(l, le)}<i>${cnt(k)}</i></button>`).join('');
    return `<ha-card class="glass"><div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span></div>
      <div class="sum">${sum}</div><div class="tabs" role="toolbar" aria-label="${hgTr('Filtr czujników', 'Sensor filter')}">${tabs}</div>
      ${ok.length ? `<div class="grid">${ok.map(tile).join('')}</div>` : `<div class="none">${hgTr('Brak dostępnych czujników w tej grupie', 'No available sensors in this group')}</div>`}
      ${un.length ? `<div class="sec">${hgTr('Niedostępne', 'Unavailable')} · ${un.length}<button data-act="unv" aria-expanded="${!!this._showUn}">${this._showUn ? hgTr('Ukryj', 'Hide') : hgTr('Pokaż', 'Show')}</button></div>${this._showUn ? `<div class="grid">${un.map(tile).join('')}</div>` : ''}` : ''}
    </ha-card>`;
  }
  onAct(a, t) {
    if (a === 'more') return H.fire(this, 'hass-more-info', { entityId: t.dataset.e });
    if (a === 'tab') { this._tab = t.dataset.k; return this.rerender(); }
    if (a === 'unv') { this._showUn = !this._showUn; return this.rerender(); }
  }
  getCardSize() { return 8; }
}
hgReg('hg-sensors-card', HGSensorsCard, hgTr('Home Glass – Czujniki', 'Home Glass – Sensors'), hgTr('Automatycznie wykryte czujniki ruchu, obecności, drzwi, okien i inne', 'Auto-discovered motion, presence, door, window and other sensors'));
