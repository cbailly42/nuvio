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
  defaults() { return { title: 'Alarm', icon: 'mdi:shield-home-outline', name: hgTr('Alarm · Dom', 'Alarm · Home'), keypad: null }; }
  /* klawiatura na stałe, jak w HA: gdy centrala ma code_format albo keypad: true (keypad: false = tylko po wybraniu akcji) */
  _pad(s) { const k = this._config.keypad; return !!s && H.ok(s) && (k === true || (k !== false && !!s.attributes.code_format)); }
  _extraSig() { return [this._pend || '', (this._code || '').length, !!this._miss, Math.floor(Date.now() / 60000)]; }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; gap:var(--s2); padding:var(--s3) var(--s3); overflow:auto; }
.big{ display:flex; align-items:center; gap:var(--s3); padding:4u 0; }
.ring{ position:relative; width:clamp(56px, calc(var(--k) * 46), 64px); height:clamp(56px, calc(var(--k) * 46), 64px); border-radius:50%; flex:none; display:flex; align-items:center; justify-content:center; color:#fff;
  background:var(--c); box-shadow:var(--hg-sh); }
.ring ha-icon{ width:28px; height:28px; --mdc-icon-size:28px; }
.ring::before, .ring::after{ content:''; position:absolute; inset:-6u; border-radius:50%; border:2u solid var(--c); opacity:0; pointer-events:none; }
.anim .ring::before{ animation:var(--hg-loop, hgring 1.6s cubic-bezier(.2,.8,.2,1) infinite); }
.anim .ring::after{ animation:var(--hg-loop, hgring 1.6s cubic-bezier(.2,.8,.2,1) .8s infinite); }
.trig .ring{ animation:var(--hg-loop, hgpulse 1s infinite); }
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
.dots em{ font-style:normal; font-size:var(--fs-sm); color:inherit; opacity:.78; text-align:center; } .dots.miss em{ opacity:1; }
.kp.in{ padding:var(--s1) var(--s2) var(--s2); }
.dots.miss em{ color:#E53935; font-weight:600; } @media (prefers-reduced-motion:no-preference){ .dots.miss{ animation:hgshake .35s; } } @keyframes hgshake{ 25%{ transform:translateX(-5px) } 75%{ transform:translateX(5px) } }
.k[disabled]{ opacity:.4; }
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
    if (!un && this._pad(s) && !this._pend) { const txt = s.attributes.code_format === 'text', n = (this._code || '').length;
      kp = `<div class="kp in">${txt ? `<input class="pw" type="password" autocomplete="off" aria-label="${hgTr('Kod alarmu', 'Alarm code')}" placeholder="${hgTr('Kod', 'Code')}">`
        : `<div class="dots${this._miss ? ' miss' : ''}" aria-live="polite">${n ? '<i></i>'.repeat(n) : `<em>${this._miss ? hgTr('Najpierw wpisz kod', 'Enter the code first') : hgTr('Wpisz kod, potem wybierz akcję', 'Enter the code, then pick an action')}</em>`}</div>
        <div class="keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button class="k" data-act="key" data-k="${d}" aria-label="${d}">${d}</button>`).join('')}
          <button class="k" data-act="kclr" aria-label="${hgTr('Wyczyść kod', 'Clear code')}" ${n ? '' : 'disabled'}>C</button><button class="k" data-act="key" data-k="0" aria-label="0">0</button>
          <button class="k" data-act="kdel" aria-label="${hgTr('Usuń cyfrę', 'Delete digit')}" ${n ? '' : 'disabled'}>${H.icon('mdi:backspace-outline')}</button></div>`}</div>`; }
    else if (this._pend) {
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
      ${this._pend ? kp : kp + (acts ? `<div class="acts">${acts}</div>` : '')}</ha-card>`;
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
    if (a === 'arm') { const m = t.dataset.m, pw = this.$.querySelector('.kp.in .pw'); if (pw) this._code = pw.value;
      if (this._pad(H.st(this._hass, this._config.entity))) { if (this._needCode(m) && !this._code) { this._miss = true; clearTimeout(this._missT); this._missT = setTimeout(() => { this._miss = false; this.rerender(); }, 2500); return this.rerender(); } return this._send(m, this._code); }
      if (this._needCode(m)) { this._pend = m; this._code = ''; return this.rerender(); } return this._send(m); }
    if (a === 'kclr') { this._code = ''; return this.rerender(); }
    if (a === 'key') { this._miss = false; if ((this._code || '').length < 12) this._code = (this._code || '') + t.dataset.k; return this.rerender(); }
    if (a === 'kdel') { this._code = (this._code || '').slice(0, -1); return this.rerender(); }
    if (a === 'kcancel') { this._pend = null; this._code = ''; return this.rerender(); }
    if (a === 'kok') { if (this._pend && this._code) this._send(this._pend, this._code); }
  }
  getCardSize() { return 5; }
}
hgReg('hg-alarm-card', HGAlarmCard, 'Home Glass – Alarm', hgTr('Stan alarmu, uzbrajanie/rozbrajanie wg supported_features, klawiatura kodu', 'Alarm state, arm/disarm per supported_features, code keypad'));
