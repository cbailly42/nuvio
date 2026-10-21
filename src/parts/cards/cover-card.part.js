/* ===================== ROLETY I BRAMY: pozycja na pasku (przeciągana), otwórz, stop, zamknij ===================== */
class HGCoverCard extends HGBase {
  static getStubConfig(h) { return { entity: hgStub(h, ['cover']) || null }; }
  defaults() { return { entity: null, name: null, icon: null }; }
  css() { return HG_NV_CSS + U(`.pw{ touch-action:none; cursor:pointer; border-radius:9u; } .pw:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:3px; } .drag .nv-prog > i{ transition:none; }
.bt{ display:flex; gap:var(--s1); justify-content:flex-end; }`); }
  _extraSig() { return [this._drag, this._pend]; }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><span class="nv-empty">${hgT('cards.cover.choose_a_cover_or')}</span></ha-card>`;
    const a = s.attributes, ok = H.ok(s), hasPos = a.current_position != null, pos = this._drag ?? this._pend ?? (hasPos ? a.current_position : s.state === 'open' ? 100 : 0), nm = c.name || H.name(h, c.entity);
    const f = a.supported_features || 0, can = (b) => !f || (f & b);   // 1 otwórz, 2 zamknij, 4 pozycja, 8 stop
    const mv = s.state === 'opening' || s.state === 'closing';
    return `<ha-card class="glass ${ok ? '' : 'un'}">${hgUI.header(nm, { icon: c.icon || a.icon || (s.state === 'open' ? 'mdi:window-shutter-open' : 'mdi:window-shutter'), sub: H.t(h, s) })}
      <div class="nv-mid">${hgUI.big(pos, { unit: '%', caption: hgT('cards.cover.open') })}
      <div class="pw ${this._drag != null ? 'drag' : ''}" role="slider" tabindex="${ok && hasPos && can(4) ? 0 : -1}" aria-label="${hgT('cards.cover.position')} ${H.esc(nm)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pos}">${hgUI.progress(pos, {})}</div></div>
      <div class="bt">${can(1) ? hgUI.iconBtn('mdi:arrow-up', 'open', hgT('common.open'), { disabled: !ok }) : ''}${can(8) ? hgUI.iconBtn('mdi:stop', 'stop', hgT('common.stop'), { disabled: !ok, on: mv }) : ''}${can(2) ? hgUI.iconBtn('mdi:arrow-down', 'close', hgT('common.close'), { disabled: !ok }) : ''}</div></ha-card>`; }
  afterRender() { const el = this.$.querySelector('.pw'); if (!el) return; const s = () => H.st(this._hass, this._config.entity);
    const off = () => { const x = s(); return !x || !H.ok(x) || x.attributes.current_position == null || (x.attributes.supported_features && !(x.attributes.supported_features & 4)); };
    hgDragVal(this, el, { off, move: (f) => { this._drag = Math.round(f * 100); el.classList.add('drag'); const p = el.querySelector('.nv-prog'); if (p) p.style.setProperty('--p', this._drag + '%'); const n = this.$.querySelector('.nv-num'); if (n) n.textContent = this._drag; },
      end: (f) => { this._drag = null; el.classList.remove('drag'); if (f != null) this._send(Math.round(f * 100)); else this.rerender(); },
      key: (d) => this._send(Math.max(0, Math.min(100, (this._pend ?? s().attributes.current_position) + d * 10))) }); }
  _send(v) { this._pend = v; clearTimeout(this._pt); this._pt = setTimeout(() => { this._pend = null; this.rerender(); }, 6000); H.haptic(); H.call(this._hass, 'cover', 'set_cover_position', { entity_id: this._config.entity, position: v }); this.rerender(); }
  set hass(h) { const o = this._hass; this._hass = h; if (this._pend != null && o && this._config) { const a = H.st(h, this._config.entity), b = H.st(o, this._config.entity); if (a && b && a.attributes.current_position !== b.attributes.current_position && a.state !== 'opening' && a.state !== 'closing') this._pend = null; } this._update(); }
  get hass() { return this._hass; }
  onAct(a) { const e = { entity_id: this._config.entity }; this._pend = null; H.haptic();
    if (a === 'open') H.call(this._hass, 'cover', 'open_cover', e); if (a === 'close') H.call(this._hass, 'cover', 'close_cover', e); if (a === 'stop') H.call(this._hass, 'cover', 'stop_cover', e); }
  getGridOptions() { return { columns: 6, rows: 3 }; }
}
hgReg('hg-cover-card', HGCoverCard, hgTLazy('cards.cover.picker_name'), hgTLazy('cards.cover.picker_description'));
