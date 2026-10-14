/* --- suwak: jasność, głośność, prędkość wentylatora, pozycja rolety, input_number / number --- */
class HGSliderCard extends HGBase {
  defaults() { return { entity: null, name: null, icon: null, mode: 'h' }; }
  ents() { return [this._config.entity]; }
  _extraSig() { return [this._drag, this._pend]; }
  css() { return HG_GEN_CSS + U(`
ha-card.glass{ display:flex; flex-direction:column; justify-content:space-between; gap:12px; padding:16px; }
.trk{ position:relative; height:44px; border-radius:var(--r-md); background:color-mix(in srgb, currentColor 10%, transparent); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 8%, transparent); touch-action:none; cursor:pointer; overflow:hidden; }
.gfl{ position:absolute; left:0; top:0; bottom:0; border-radius:var(--r-md); background:var(--hg-accent); min-width:20px; transition:width 150ms cubic-bezier(.2,0,0,1), height 150ms cubic-bezier(.2,0,0,1); }
.gfl::after{ content:''; position:absolute; right:8px; top:30%; bottom:30%; width:3px; border-radius:2px; background:color-mix(in srgb, var(--hg-on-accent) 55%, transparent); }
.drag .gfl{ transition:none; } .off .gfl{ background:color-mix(in srgb, currentColor 22%, transparent); }
.v ha-card.glass{ align-items:stretch; } .v .trk{ flex:1; height:auto; min-height:160px; width:100%; border-radius:var(--r-md); }
.v .gfl{ top:auto; right:0; bottom:0; width:auto !important; min-width:0; min-height:20px; border-radius:var(--r-md); } .v .gfl::after{ left:30%; right:30%; top:8px; bottom:auto; width:auto; height:3px; }
.un .trk{ cursor:not-allowed; }
`); }
  render() { const c = this._config, h = this._hass, m = hgSlider(h, c.entity), s = m.s, nm = c.name || H.name(h, c.entity), v = this._drag ?? this._pend ?? m.v, p = m.max > m.min ? ((v - m.min) / (m.max - m.min)) * 100 : 0;
    if (!c.entity || !s) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Wybierz encję', 'Choose an entity')}</b>${hgTr('Suwak działa ze światłem, odtwarzaczem, wentylatorem, roletą i input_number', 'The slider works with lights, media players, fans, covers and input_number')}</div></ha-card>`;
    const ic = c.icon || s.attributes.icon || HG_DOM_ICON2[m.d] || 'mdi:tune-variant', tog = ['light', 'fan', 'media_player'].includes(m.d) && H.ok(s);
    const vert = c.mode === 'v', fill = vert ? `height:${p}%` : `width:${p}%`;
    return `<div class="${vert ? 'v' : ''}" style="height:100%"><ha-card class="glass ${m.on && v > m.min ? '' : 'off'} ${m.ok ? '' : 'un'}"><div class="gh">
      ${tog ? `<button class="gic ${m.on ? 'on' : ''}" data-act="${m.d === 'media_player' ? 'mute' : 'toggle'}" aria-label="${m.d === 'media_player' ? hgTr('Wycisz', 'Mute') : hgTr('Przełącz', 'Toggle')} ${H.esc(nm)}">${H.icon(m.d === 'media_player' && s.attributes.is_volume_muted ? 'mdi:volume-off' : ic)}</button>` : `<span class="gic ${m.on ? 'on' : ''}">${H.icon(ic)}</span>`}
      <span class="gn"><b>${H.esc(nm)}</b><small>${H.esc(m.label)}</small></span><span class="gv">${m.ok ? hgFmtV(v, m) : hgTr('niedostępne', 'unavailable')}</span></div>
      <div class="trk" role="slider" tabindex="${m.ok ? 0 : -1}" aria-label="${H.esc(m.label)} ${H.esc(nm)}" aria-orientation="${vert ? 'vertical' : 'horizontal'}" aria-valuemin="${m.min}" aria-valuemax="${m.max}" aria-valuenow="${v}" ${m.ok ? '' : 'aria-disabled="true"'}><div class="gfl" style="${fill}"></div></div></ha-card></div>`; }
  afterRender() { const t = this.$.querySelector('.trk'); if (!t || !this._once(t)) return; const off = () => !!t.getAttribute('aria-disabled'); const vert = this._config.mode === 'v';
    const m = () => hgSlider(this._hass, this._config.entity);
    const calc = (ev) => { const r = t.getBoundingClientRect(), f = vert ? 1 - (ev.clientY - r.top) / r.height : (ev.clientX - r.left) / r.width, M = m(); return hgStepRound(M.min + Math.max(0, Math.min(1, f)) * (M.max - M.min), M); };
    const paint = () => { const M = m(), p = ((this._drag - M.min) / (M.max - M.min)) * 100, f = t.querySelector('.gfl'); f.style[vert ? 'height' : 'width'] = p + '%'; const gv = this.$.querySelector('.gv'); if (gv) gv.innerHTML = hgFmtV(this._drag, M); t.setAttribute('aria-valuenow', this._drag); };
    const send = (v) => { const M = m(); if (!M.set) return; this._pend = v; clearTimeout(this._pt); this._pt = setTimeout(() => { this._pend = null; this.rerender(); }, 4000); M.set(v); this.rerender(); };
    t.addEventListener('pointerdown', (ev) => { if (off()) return; t.setPointerCapture(ev.pointerId); this._drag = calc(ev); t.classList.add('drag'); paint(); this._busy = true; });
    t.addEventListener('pointermove', (ev) => { if (this._drag == null) return; this._drag = calc(ev); paint(); });
    const end = () => { if (this._drag == null) return; const v = this._drag; this._drag = null; this._busy = false; t.classList.remove('drag'); send(v); };
    t.addEventListener('pointerup', end); t.addEventListener('pointercancel', end);
    t.addEventListener('keydown', (ev) => { const M = m(), k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[ev.key]; if (!k || off()) return; ev.preventDefault();
      const st = M.unit === '%' && M.step < 5 ? 5 : M.step; send(hgStepRound((this._pend ?? M.v) + k * st, M)); }); }
  set hass(h) { const o = this._hass; this._hass = h; if (this._pend != null && o && this._config) { const a = H.st(h, this._config.entity), b = H.st(o, this._config.entity); if (a && b && a.last_updated !== b.last_updated) this._pend = null; } this._update(); }
  get hass() { return this._hass; }
  onAct(a) { const e = this._config.entity, s = H.st(this._hass, e); if (!H.ok(s)) return;
    if (a === 'toggle') return H.call(this._hass, hgDom(e), 'toggle', { entity_id: e });
    if (a === 'mute') return H.call(this._hass, 'media_player', 'volume_mute', { entity_id: e, is_volume_muted: !s.attributes.is_volume_muted }); }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-slider-card', HGSliderCard, hgTr('Home Glass – Suwak', 'Home Glass – Slider'), hgTr('Suwak dla jasności, głośności, wentylatora, rolety i input_number', 'Slider for brightness, volume, fan, cover and input_number'));
