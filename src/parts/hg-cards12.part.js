/* ===== komponenty ogólne: suwak, przycisk, lista encji, wybór, licznik, wskaźnik ===== */
/* wspólne: przełącznik i przyciski w tokenach arkuszy (lime = główny, szkło = drugorzędny) */
const HG_GEN_CSS = `
.gsw{ all:unset; cursor:pointer; flex:none; position:relative; width:46px; height:28px; border-radius:999px; background:color-mix(in srgb, currentColor 16%, transparent); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 12%, transparent); transition:background-color 150ms; }
.gsw .gkn{ position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:50%; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.3); transition:transform 150ms cubic-bezier(.2,0,0,1); }
.gsw[aria-checked=true]{ background:var(--hg-accent); box-shadow:none; } .gsw[aria-checked=true] .gkn{ transform:translateX(18px); } .gsw:disabled{ opacity:.4; cursor:default; }
.gb{ all:unset; cursor:pointer; box-sizing:border-box; flex:none; height:36px; padding:0 16px; border-radius:999px; display:inline-flex; align-items:center; justify-content:center; gap:8px; font-size:13px; font-weight:500;
  background:color-mix(in srgb, currentColor 8%, transparent); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 12%, transparent); transition:background-color 150ms, transform 150ms, box-shadow 150ms; }
.gb.ok, .gb[aria-pressed=true]{ background:var(--hg-accent); color:var(--hg-on-accent); box-shadow:none; font-weight:600; } .gb:disabled{ opacity:.4; cursor:default; } .gb ha-icon{ width:18px; height:18px; --mdc-icon-size:18px; }
.gb.r{ width:44px; height:44px; padding:0; } .gb.r ha-icon{ width:22px; height:22px; --mdc-icon-size:22px; }
:is(.gb, .gsw, .gt, [role=slider], .gbig):focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
:is(.gb, .gbig):active:not(:disabled){ transform:scale(.96); }
@media (prefers-reduced-motion:reduce){ .gsw .gkn, .gb, .gfl{ transition:none !important; } }
.gic{ flex:none; width:40px; height:40px; border-radius:12px; display:grid; place-items:center; background:color-mix(in srgb, currentColor 8%, transparent); transition:background-color 150ms, color 150ms; }
.gic ha-icon{ width:22px; height:22px; --mdc-icon-size:22px; } .gic.on{ background:color-mix(in srgb, var(--hg-accent) 22%, transparent); color:var(--hg-accent-tx, var(--hg-accent)); }
button.gic{ all:unset; cursor:pointer; flex:none; width:40px; height:40px; border-radius:12px; display:grid; place-items:center; background:color-mix(in srgb, currentColor 8%, transparent); }
button.gic.on{ background:color-mix(in srgb, var(--hg-accent) 22%, transparent); color:var(--hg-accent-tx, var(--hg-accent)); }
.gh{ display:flex; align-items:center; gap:12px; min-width:0; } .gn{ flex:1; min-width:0; display:flex; flex-direction:column; }
.gn b{ font-size:15px; font-weight:600; letter-spacing:-.01em; line-height:1.25; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow-wrap:anywhere; } .gn small{ font-size:12px; opacity:.66; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.gv{ font-size:15px; font-weight:600; font-variant-numeric:tabular-nums; white-space:nowrap; } .gv small{ font-size:12px; font-weight:500; opacity:.66; margin-left:2px; }
.un{ opacity:.55; }
`;
const hgDom = (e) => String(e || '').split('.')[0];
const HG_TOGGLE_DOM = ['light', 'switch', 'fan', 'input_boolean', 'automation', 'siren', 'humidifier', 'climate', 'media_player', 'water_heater', 'vacuum', 'lock', 'cover', 'valve'];
const HG_PRESS_DOM = ['script', 'scene', 'button', 'input_button', 'automation'];
/* model suwaka: wartość, zakres i zapis wg domeny */
const hgSlider = (h, e) => { const s = H.st(h, e), d = hgDom(e), a = (s && s.attributes) || {}, on = !!s && !['off', 'unavailable', 'unknown', 'closed', 'idle', 'standby'].includes(s.state);
  const r = { d, s, on, min: 0, max: 100, step: 1, unit: '%', v: 0, ok: H.ok(s), label: 'Poziom' };
  if (!s) return r;
  if (d === 'light') { r.v = s.state === 'on' ? (a.brightness == null ? 100 : Math.round(a.brightness / 2.55)) : 0; r.label = 'Jasność'; r.ok = r.ok && (a.supported_color_modes || []).some((m) => m !== 'onoff');
    r.set = (v) => (v <= 0 ? H.call(h, 'light', 'turn_off', { entity_id: e }) : H.call(h, 'light', 'turn_on', { entity_id: e, brightness_pct: v })); }
  else if (d === 'media_player') { r.v = Math.round((a.volume_level || 0) * 100); r.label = 'Głośność'; r.ok = r.ok && a.volume_level != null; r.set = (v) => H.call(h, 'media_player', 'volume_set', { entity_id: e, volume_level: v / 100 }); }
  else if (d === 'fan') { r.v = s.state === 'on' ? (a.percentage == null ? 100 : a.percentage) : 0; r.step = a.percentage_step || 1; r.label = 'Prędkość';
    r.set = (v) => (v <= 0 ? H.call(h, 'fan', 'turn_off', { entity_id: e }) : H.call(h, 'fan', 'set_percentage', { entity_id: e, percentage: Math.round(v) })); }
  else if (d === 'cover' || d === 'valve') { r.v = a.current_position ?? a.current_valve_position ?? (s.state === 'open' ? 100 : 0); r.label = 'Otwarcie'; r.ok = r.ok && (a.current_position != null || a.current_valve_position != null);
    r.set = (v) => (d === 'cover' ? H.call(h, 'cover', 'set_cover_position', { entity_id: e, position: Math.round(v) }) : H.call(h, 'valve', 'set_valve_position', { entity_id: e, position: Math.round(v) })); }
  else if (d === 'input_number' || d === 'number') { r.min = +a.min || 0; r.max = a.max == null ? 100 : +a.max; r.step = +a.step || 1; r.unit = a.unit_of_measurement || ''; r.v = parseFloat(s.state); if (!isFinite(r.v)) r.v = r.min; r.on = true; r.label = 'Wartość';
    r.set = (v) => H.call(h, d, 'set_value', { entity_id: e, value: v }); }
  else r.ok = false;
  return r; };
const hgStepRound = (v, m) => { const n = Math.round((v - m.min) / m.step) * m.step + m.min, dp = (String(m.step).split('.')[1] || '').length; return +Math.max(m.min, Math.min(m.max, n)).toFixed(dp); };
const hgFmtV = (v, m) => `${H.fmt(v, (String(m.step).split('.')[1] || '').length)}${m.unit ? `<small>${H.esc(m.unit)}</small>` : ''}`;

/* --- suwak: jasność, głośność, prędkość wentylatora, pozycja rolety, input_number / number --- */
class HGSliderCard extends HGBase {
  defaults() { return { entity: null, name: null, icon: null, mode: 'h' }; }
  ents() { return [this._config.entity]; }
  _extraSig() { return [this._drag, this._pend]; }
  css() { return HG_GEN_CSS + U(`
ha-card.glass{ display:flex; flex-direction:column; justify-content:space-between; gap:12px; padding:16px; }
.trk{ position:relative; height:44px; border-radius:14px; background:color-mix(in srgb, currentColor 10%, transparent); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 8%, transparent); touch-action:none; cursor:pointer; overflow:hidden; }
.gfl{ position:absolute; left:0; top:0; bottom:0; border-radius:14px; background:var(--hg-accent); min-width:20px; transition:width 150ms cubic-bezier(.2,0,0,1), height 150ms cubic-bezier(.2,0,0,1); }
.gfl::after{ content:''; position:absolute; right:8px; top:30%; bottom:30%; width:3px; border-radius:2px; background:color-mix(in srgb, var(--hg-on-accent) 55%, transparent); }
.drag .gfl{ transition:none; } .off .gfl{ background:color-mix(in srgb, currentColor 22%, transparent); }
.v ha-card.glass{ align-items:stretch; } .v .trk{ flex:1; height:auto; min-height:160px; width:100%; border-radius:20px; }
.v .gfl{ top:auto; right:0; bottom:0; width:auto !important; min-width:0; min-height:20px; border-radius:20px; } .v .gfl::after{ left:30%; right:30%; top:8px; bottom:auto; width:auto; height:3px; }
.un .trk{ cursor:not-allowed; }
`); }
  render() { const c = this._config, h = this._hass, m = hgSlider(h, c.entity), s = m.s, nm = c.name || H.name(h, c.entity), v = this._drag ?? this._pend ?? m.v, p = m.max > m.min ? ((v - m.min) / (m.max - m.min)) * 100 : 0;
    if (!c.entity || !s) return `<ha-card class="glass"><div class="ph"><b>Wybierz encję</b>Suwak działa ze światłem, odtwarzaczem, wentylatorem, roletą i input_number</div></ha-card>`;
    const ic = c.icon || s.attributes.icon || HG_DOM_ICON2[m.d] || 'mdi:tune-variant', tog = ['light', 'fan', 'media_player'].includes(m.d) && H.ok(s);
    const vert = c.mode === 'v', fill = vert ? `height:${p}%` : `width:${p}%`;
    return `<div class="${vert ? 'v' : ''}" style="height:100%"><ha-card class="glass ${m.on && v > m.min ? '' : 'off'} ${m.ok ? '' : 'un'}"><div class="gh">
      ${tog ? `<button class="gic ${m.on ? 'on' : ''}" data-act="${m.d === 'media_player' ? 'mute' : 'toggle'}" aria-label="${m.d === 'media_player' ? 'Wycisz' : 'Przełącz'} ${H.esc(nm)}">${H.icon(m.d === 'media_player' && s.attributes.is_volume_muted ? 'mdi:volume-off' : ic)}</button>` : `<span class="gic ${m.on ? 'on' : ''}">${H.icon(ic)}</span>`}
      <span class="gn"><b>${H.esc(nm)}</b><small>${H.esc(m.label)}</small></span><span class="gv">${m.ok ? hgFmtV(v, m) : 'niedostępne'}</span></div>
      <div class="trk" role="slider" tabindex="${m.ok ? 0 : -1}" aria-label="${H.esc(m.label)} ${H.esc(nm)}" aria-orientation="${vert ? 'vertical' : 'horizontal'}" aria-valuemin="${m.min}" aria-valuemax="${m.max}" aria-valuenow="${v}" ${m.ok ? '' : 'aria-disabled="true"'}><div class="gfl" style="${fill}"></div></div></ha-card></div>`; }
  afterRender() { const t = this.$.querySelector('.trk'); if (!t || t.getAttribute('aria-disabled')) return; const vert = this._config.mode === 'v';
    const m = () => hgSlider(this._hass, this._config.entity);
    const calc = (ev) => { const r = t.getBoundingClientRect(), f = vert ? 1 - (ev.clientY - r.top) / r.height : (ev.clientX - r.left) / r.width, M = m(); return hgStepRound(M.min + Math.max(0, Math.min(1, f)) * (M.max - M.min), M); };
    const paint = () => { const M = m(), p = ((this._drag - M.min) / (M.max - M.min)) * 100, f = t.querySelector('.gfl'); f.style[vert ? 'height' : 'width'] = p + '%'; const gv = this.$.querySelector('.gv'); if (gv) gv.innerHTML = hgFmtV(this._drag, M); t.setAttribute('aria-valuenow', this._drag); };
    const send = (v) => { const M = m(); if (!M.set) return; this._pend = v; clearTimeout(this._pt); this._pt = setTimeout(() => { this._pend = null; this.rerender(); }, 4000); M.set(v); this.rerender(); };
    t.addEventListener('pointerdown', (ev) => { t.setPointerCapture(ev.pointerId); this._drag = calc(ev); t.classList.add('drag'); paint(); this._busy = true; });
    t.addEventListener('pointermove', (ev) => { if (this._drag == null) return; this._drag = calc(ev); paint(); });
    const end = () => { if (this._drag == null) return; const v = this._drag; this._drag = null; this._busy = false; t.classList.remove('drag'); send(v); };
    t.addEventListener('pointerup', end); t.addEventListener('pointercancel', end);
    t.addEventListener('keydown', (ev) => { const M = m(), k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[ev.key]; if (!k) return; ev.preventDefault();
      const st = M.unit === '%' && M.step < 5 ? 5 : M.step; send(hgStepRound((this._pend ?? M.v) + k * st, M)); }); }
  set hass(h) { const o = this._hass; this._hass = h; if (this._pend != null && o && this._config) { const a = H.st(h, this._config.entity), b = H.st(o, this._config.entity); if (a && b && a.last_updated !== b.last_updated) this._pend = null; } this._update(); }
  get hass() { return this._hass; }
  onAct(a) { const e = this._config.entity, s = H.st(this._hass, e); if (!H.ok(s)) return;
    if (a === 'toggle') return H.call(this._hass, hgDom(e), 'toggle', { entity_id: e });
    if (a === 'mute') return H.call(this._hass, 'media_player', 'volume_mute', { entity_id: e, is_volume_muted: !s.attributes.is_volume_muted }); }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-slider-card', HGSliderCard, 'Home Glass – Suwak', 'Suwak dla jasności, głośności, wentylatora, rolety i input_number');

/* --- przycisk: skrypt, scena, button.press, automatyzacja albo dowolna akcja (tap_action) --- */
const hgPress = (node, h, e, act) => { if (act) return H.action(node, h, act); const d = hgDom(e);
  if (d === 'script') return H.call(h, 'script', 'turn_on', { entity_id: e }); if (d === 'scene') return H.call(h, 'scene', 'turn_on', { entity_id: e });
  if (d === 'button' || d === 'input_button') return H.call(h, d, 'press', { entity_id: e }); if (d === 'automation') return H.call(h, 'automation', 'trigger', { entity_id: e });
  if (d === 'lock') { const s = H.st(h, e); return H.call(h, 'lock', s && s.state === 'locked' ? 'unlock' : 'lock', { entity_id: e }); }
  return H.call(h, 'homeassistant', 'toggle', { entity_id: e }); };
class HGButtonCard extends HGBase {
  defaults() { return { entity: null, name: null, icon: null, mode: 'tile', tap_action: null, subtitle: null }; }
  ents() { return this._config.entity ? [this._config.entity] : []; }
  _extraSig() { return [this._ok ? 1 : 0]; }
  css() { return HG_GEN_CSS + U(`
ha-card.glass{ padding:0; }
.gbig{ all:unset; cursor:pointer; box-sizing:border-box; width:100%; height:100%; display:flex; flex-direction:column; align-items:flex-start; justify-content:space-between; gap:12px; padding:16px; transition:transform 150ms; }
.gbig:disabled{ cursor:default; } .gbig .gic{ width:48px; height:48px; border-radius:14px; } .gbig .gic ha-icon{ width:26px; height:26px; --mdc-icon-size:26px; }
.pill .gbig{ flex-direction:row; align-items:center; justify-content:flex-start; padding:12px 16px; } .pill .gbig .gic{ width:40px; height:40px; border-radius:12px; }
.ok .gic{ background:var(--hg-accent); color:var(--hg-on-accent); } .ok .gic ha-icon{ animation:gpop .4s cubic-bezier(.2,.8,.2,1.3); } @keyframes gpop{ from{ transform:scale(.4); opacity:0 } }
.ok .gn small{ color:var(--hg-accent-tx, var(--hg-accent)); opacity:1; } .pill .chev{ margin-left:auto; opacity:.5; width:20px; height:20px; }
`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity), d = hgDom(c.entity), nm = c.name || (c.entity ? H.name(h, c.entity) : 'Przycisk');
    if (!c.entity && !c.tap_action) return `<ha-card class="glass"><div class="ph"><b>Wybierz encję lub akcję</b>Skrypt, scena, przycisk albo tap_action</div></ha-card>`;
    const un = c.entity && (!s || s.state === 'unavailable' || (!H.ok(s) && !HG_PRESS_DOM.includes(d))) && !c.tap_action, on = s && ['on', 'unlocked', 'open'].includes(s.state) && !HG_PRESS_DOM.includes(d), ok = this._ok;
    const sub = un ? 'niedostępne' : ok ? 'Wykonano' : c.subtitle || (HG_PRESS_DOM.includes(d) || c.tap_action ? 'Dotknij, aby uruchomić' : H.t(h, s));
    const ic = ok ? 'mdi:check' : c.icon || (s && s.attributes.icon) || HG_DOM_ICON2[d] || 'mdi:gesture-tap-button';
    return `<ha-card class="glass ${c.mode === 'pill' ? 'pill' : ''} ${ok ? 'ok' : ''} ${un ? 'un' : ''}"><button class="gbig" data-act="press" ${un ? 'disabled' : ''} aria-label="${H.esc(nm)}: ${H.esc(sub)}">
      <span class="gic ${on ? 'on' : ''}">${H.icon(ic)}</span><span class="gn"><b>${H.esc(nm)}</b><small>${H.esc(sub)}</small></span>${c.mode === 'pill' ? H.icon('mdi:chevron-right', 'chev') : ''}</button></ha-card>`; }
  onAct(a) { if (a !== 'press') return; const c = this._config; hgPress(this, this._hass, c.entity, c.tap_action); this._ok = true; this.rerender(); clearTimeout(this._ot); this._ot = setTimeout(() => { this._ok = false; this.rerender(); }, 1600); }
  getGridOptions() { return { columns: 3, rows: 2 }; }
}
hgReg('hg-button-card', HGButtonCard, 'Home Glass – Przycisk', 'Przycisk dla skryptu, sceny, button.press lub dowolnej akcji');

/* --- lista encji: wiersze z przełącznikiem, przyciskiem lub wartością --- */
class HGEntitiesCard extends HGBase {
  defaults() { return { title: 'Encje', icon: 'mdi:format-list-bulleted', entities: [] }; }
  ents() { return this._config.entities.map((x) => (typeof x === 'string' ? x : x.entity)); }
  css() { return HG_GEN_CSS + U(`
ha-card.glass{ display:flex; flex-direction:column; gap:4px; padding:16px; overflow:auto; }
.ghd{ display:flex; align-items:center; gap:8px; margin-bottom:4px; font-size:15px; font-weight:600; } .ghd ha-icon{ width:20px; height:20px; opacity:.8; }
.gr{ display:flex; align-items:center; gap:12px; min-height:56px; padding:4px 0; } .gr + .gr{ box-shadow:0 -1px 0 color-mix(in srgb, currentColor 8%, transparent); }
.gr .gn{ cursor:pointer; } .gr .gn:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; border-radius:8px; }
`); }
  render() { const c = this._config, h = this._hass;
    if (!c.entities.length) return `<ha-card class="glass"><div class="ph"><b>Dodaj encje</b>Lista z przełącznikami i wartościami</div></ha-card>`;
    const rows = c.entities.map((x) => { const o = typeof x === 'string' ? { entity: x } : x, e = o.entity, s = H.st(h, e), d = hgDom(e), ok = H.ok(s), nm = o.name || H.name(h, e);
      const on = s && ['on', 'open', 'unlocked', 'playing', 'home'].includes(s.state), ic = o.icon || (s && s.attributes.icon) || HG_DOM_ICON2[d] || 'mdi:circle-outline';
      const num = s && isFinite(parseFloat(s.state)) && s.attributes.unit_of_measurement, val = num ? `${H.fmt(parseFloat(s.state), 1)}<small>${H.esc(s.attributes.unit_of_measurement)}</small>` : H.esc(H.t(h, s));
      const ctl = HG_PRESS_DOM.includes(d) ? `<button class="gb" data-act="press" data-e="${H.esc(e)}" ${s && s.state !== 'unavailable' ? '' : 'disabled'}>${H.icon('mdi:play')}Uruchom</button>`
        : ['light', 'switch', 'fan', 'input_boolean', 'siren', 'humidifier'].includes(d) ? `<button class="gsw" role="switch" data-act="tog" data-e="${H.esc(e)}" aria-checked="${!!on}" aria-label="${H.esc(nm)}" ${ok ? '' : 'disabled'}><span class="gkn"></span></button>`
        : `<span class="gv">${val}</span>`;
      return `<div class="gr ${ok || (HG_PRESS_DOM.includes(d) && s && s.state !== 'unavailable') ? '' : 'un'}"><span class="gic ${on ? 'on' : ''}">${H.icon(ic)}</span><span class="gn" role="button" tabindex="0" data-act="more" data-e="${H.esc(e)}"><b>${H.esc(nm)}</b>${HG_PRESS_DOM.includes(d) || /gsw/.test(ctl) ? `<small>${H.esc(H.t(h, s))}</small>` : ''}</span>${ctl}</div>`; }).join('');
    return `<ha-card class="glass"><div class="ghd">${H.icon(c.icon)}<span>${H.esc(c.title)}</span></div>${rows}</ha-card>`; }
  onAct(a, t) { const e = t.dataset.e, h = this._hass; if (!e) return;
    if (a === 'more') return H.fire(this, 'hass-more-info', { entityId: e });
    if (a === 'tog') return H.call(h, hgDom(e), 'toggle', { entity_id: e });
    if (a === 'press') return hgPress(this, h, e); }
  getGridOptions() { return { columns: 6, rows: 'auto' }; }
}
hgReg('hg-entities-card', HGEntitiesCard, 'Home Glass – Lista encji', 'Wiersze encji z przełącznikiem, przyciskiem lub wartością');

/* --- wybór opcji: input_select / select --- */
class HGSelectCard extends HGBase {
  defaults() { return { entity: null, name: null, icon: null, mode: 'chips' }; }
  ents() { return [this._config.entity]; }
  _extraSig() { return [this._pend]; }
  css() { return HG_GEN_CSS + U(`
ha-card.glass{ display:flex; flex-direction:column; gap:12px; padding:16px; overflow:auto; }
.gops{ display:flex; flex-wrap:wrap; gap:8px; } .list .gops{ flex-direction:column; flex-wrap:nowrap; gap:4px; }
.list .gb{ height:44px; justify-content:flex-start; padding:0 14px; border-radius:12px; } .list .gb .ck{ margin-left:auto; } .gb:not([aria-pressed=true]) .ck{ display:none; }
`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity), nm = c.name || H.name(h, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>Wybierz encję</b>input_select lub select</div></ha-card>`;
    const ok = H.ok(s), cur = this._pend ?? s.state, ic = c.icon || s.attributes.icon || 'mdi:format-list-bulleted-square';
    const ops = (s.attributes.options || []).map((o) => `<button class="gb" data-act="opt" data-o="${H.esc(o)}" aria-pressed="${o === cur}" ${ok ? '' : 'disabled'}>${H.esc(o)}${c.mode === 'list' ? H.icon('mdi:check', 'ck') : ''}</button>`).join('');
    return `<ha-card class="glass ${c.mode === 'list' ? 'list' : ''} ${ok ? '' : 'un'}"><div class="gh"><span class="gic on">${H.icon(ic)}</span><span class="gn"><b>${H.esc(nm)}</b><small>${H.esc(ok ? cur : 'niedostępne')}</small></span></div>
      <div class="gops" role="radiogroup" aria-label="${H.esc(nm)}">${ops}</div></ha-card>`; }
  onAct(a, t) { if (a !== 'opt') return; const e = this._config.entity; this._pend = t.dataset.o; clearTimeout(this._pt); this._pt = setTimeout(() => { this._pend = null; this.rerender(); }, 3000);
    H.call(this._hass, hgDom(e), 'select_option', { entity_id: e, option: t.dataset.o }); this.rerender(); }
  set hass(h) { const o = this._hass; this._hass = h; if (this._pend != null && o && this._config) { const a = H.st(h, this._config.entity), b = H.st(o, this._config.entity); if (a && b && a.state !== b.state) this._pend = null; } this._update(); }
  get hass() { return this._hass; }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-select-card', HGSelectCard, 'Home Glass – Wybór', 'Opcje input_select i select jako przyciski lub lista');

/* --- licznik / krokowy: counter, input_number, number --- */
class HGStepperCard extends HGBase {
  defaults() { return { entity: null, name: null, icon: null }; }
  ents() { return [this._config.entity]; }
  _extraSig() { return [this._pend]; }
  css() { return HG_GEN_CSS + U(`
ha-card.glass{ display:flex; flex-direction:column; justify-content:space-between; gap:12px; padding:16px; container-type:inline-size; }
.gst{ display:flex; align-items:center; justify-content:space-between; gap:8px; } .gst .gb.r{ width:40px; height:40px; } .gbn{ min-width:0; white-space:nowrap; font-size:clamp(22px, 9cqi, 32px); font-weight:600; letter-spacing:-.02em; font-variant-numeric:tabular-nums; text-align:center; flex:1; } .gbn small{ font-size:14px; font-weight:500; opacity:.66; margin-left:4px; }
.gst .gb.r.ok{ box-shadow:none; }
`); }
  _m() { const h = this._hass, e = this._config.entity, s = H.st(h, e), d = hgDom(e), a = (s && s.attributes) || {};
    if (d === 'counter') return { d, s, min: a.minimum ?? -Infinity, max: a.maximum ?? Infinity, step: a.step || 1, unit: '', v: parseFloat(s && s.state) || 0 };
    const m = hgSlider(h, e); return Object.assign(m, { d }); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity), nm = c.name || H.name(h, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>Wybierz encję</b>counter, input_number lub number</div></ha-card>`;
    const m = this._m(), ok = H.ok(s), v = this._pend ?? m.v, ic = c.icon || s.attributes.icon || (m.d === 'counter' ? 'mdi:counter' : 'mdi:numeric');
    return `<ha-card class="glass ${ok ? '' : 'un'}"><div class="gh"><span class="gic on">${H.icon(ic)}</span><span class="gn"><b>${H.esc(nm)}</b><small>${m.d === 'counter' ? 'Licznik' : 'Krok ' + H.fmt(m.step, 3)}</small></span>${m.d === 'counter' ? `<button class="gb" data-act="reset" aria-label="Wyzeruj" ${ok ? '' : 'disabled'}>${H.icon('mdi:restore')}</button>` : ''}</div>
      <div class="gst"><button class="gb r" data-act="dec" aria-label="Zmniejsz" ${ok && v > m.min ? '' : 'disabled'}>${H.icon('mdi:minus')}</button><span class="gbn" aria-live="polite">${ok ? hgFmtV(v, m).replace('<small>', '<small>') : 'niedostępne'}</span><button class="gb r ok" data-act="inc" aria-label="Zwiększ" ${ok && v < m.max ? '' : 'disabled'}>${H.icon('mdi:plus')}</button></div></ha-card>`; }
  onAct(a) { const e = this._config.entity, h = this._hass, m = this._m(); if (!H.ok(m.s)) return;
    if (m.d === 'counter') { const sv = { inc: 'increment', dec: 'decrement', reset: 'reset' }[a]; if (!sv) return; this._pend = a === 'reset' ? (m.s.attributes.initial ?? 0) : m.v + (a === 'inc' ? m.step : -m.step); H.call(h, 'counter', sv, { entity_id: e }); }
    else { const nv = hgStepRound((this._pend ?? m.v) + (a === 'inc' ? m.step : -m.step), m); this._pend = nv; m.set && m.set(nv); }
    clearTimeout(this._pt); this._pt = setTimeout(() => { this._pend = null; this.rerender(); }, 3000); this.rerender(); }
  set hass(h) { const o = this._hass; this._hass = h; if (this._pend != null && o && this._config) { const a = H.st(h, this._config.entity), b = H.st(o, this._config.entity); if (a && b && a.state !== b.state) this._pend = null; } this._update(); }
  get hass() { return this._hass; }
  getGridOptions() { return { columns: 3, rows: 2 }; }
}
hgReg('hg-stepper-card', HGStepperCard, 'Home Glass – Licznik', 'Plus i minus dla counter, input_number i number');

/* --- wskaźnik: łuk 240° dla czujnika liczbowego --- */
class HGGaugeCard extends HGBase {
  defaults() { return { entity: null, name: null, icon: null, min: null, max: null }; }
  ents() { return [this._config.entity]; }
  css() { return HG_GEN_CSS + U(`
ha-card.glass{ display:flex; flex-direction:column; align-items:stretch; gap:8px; padding:16px; }
.gg{ position:relative; flex:1; display:grid; place-items:center; min-height:120px; } .gg svg{ width:100%; max-width:220px; height:auto; overflow:visible; }
.gg .bg{ stroke:color-mix(in srgb, currentColor 12%, transparent); } .gg .fg{ stroke:var(--hg-accent); transition:stroke-dashoffset 400ms cubic-bezier(.2,0,0,1); }
.gg .num{ position:absolute; left:0; right:0; top:50%; transform:translateY(-35%); text-align:center; font-size:30px; font-weight:600; letter-spacing:-.02em; font-variant-numeric:tabular-nums; } .gg .num small{ font-size:14px; font-weight:500; opacity:.66; margin-left:2px; }
.gg .mm{ position:absolute; left:14%; right:14%; bottom:2%; display:flex; justify-content:space-between; font-size:11px; opacity:.6; font-variant-numeric:tabular-nums; }
@media (prefers-reduced-motion:reduce){ .gg .fg{ transition:none; } }
`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity), nm = c.name || H.name(h, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>Wybierz czujnik</b>Dowolny czujnik liczbowy</div></ha-card>`;
    const u = s.attributes.unit_of_measurement || '', v = parseFloat(s.state), ok = isFinite(v), mn = c.min ?? (u === '°C' ? -20 : 0), mx = c.max ?? (u === '%' ? 100 : u === '°C' ? 40 : u === 'W' ? 5000 : u === 'ppm' ? 2000 : 100);
    const f = ok ? Math.max(0, Math.min(1, (v - mn) / (mx - mn))) : 0, R = 80, L = (2 * Math.PI * R) * (240 / 360), ic = c.icon || s.attributes.icon || 'mdi:gauge';
    const arc = 'M 30.72 140 A 80 80 0 1 1 169.28 140';
    return `<ha-card class="glass ${ok ? '' : 'un'}"><div class="gh"><span class="gic on">${H.icon(ic)}</span><span class="gn"><b>${H.esc(nm)}</b><small>${H.esc(ok ? ({ temperature: 'Temperatura', humidity: 'Wilgotność', power: 'Moc', battery: 'Bateria', carbon_dioxide: 'CO₂', illuminance: 'Natężenie światła', pm25: 'PM2.5', pressure: 'Ciśnienie', energy: 'Energia' }[s.attributes.device_class] || 'Czujnik') : 'niedostępne')}</small></span></div>
      <div class="gg" role="meter" aria-label="${H.esc(nm)}" aria-valuemin="${mn}" aria-valuemax="${mx}" aria-valuenow="${ok ? v : ''}"><svg viewBox="0 0 200 170" aria-hidden="true"><path class="bg" d="${arc}" fill="none" stroke-width="14" stroke-linecap="round"/><path class="fg" d="${arc}" fill="none" stroke-width="14" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - f)}"/></svg>
      <span class="num">${ok ? `${H.fmt(v, 1)}<small>${H.esc(u)}</small>` : '–'}</span><span class="mm"><span>${H.fmt(mn)}</span><span>${H.fmt(mx)}</span></span></div></ha-card>`; }
  onAct() {}
  getGridOptions() { return { columns: 3, rows: 3 }; }
}
hgReg('hg-gauge-card', HGGaugeCard, 'Home Glass – Wskaźnik', 'Łuk z wartością czujnika liczbowego');
