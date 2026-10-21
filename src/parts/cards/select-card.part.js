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
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${hgT('common.choose_entity')}</b>${hgT('cards.select.input_select_or_select')}</div></ha-card>`;
    const ok = H.ok(s), cur = this._pend ?? s.state, ic = c.icon || s.attributes.icon || 'mdi:format-list-bulleted-square';
    const ops = (s.attributes.options || []).map((o) => `<button class="gb" data-act="opt" data-o="${H.esc(o)}" aria-pressed="${o === cur}" ${ok ? '' : 'disabled'}>${H.esc(o)}${c.mode === 'list' ? H.icon('mdi:check', 'ck') : ''}</button>`).join('');
    return `<ha-card class="glass ${c.mode === 'list' ? 'list' : ''} ${ok ? '' : 'un'}"><div class="gh"><span class="gic on">${H.icon(ic)}</span><span class="gn"><b>${H.esc(nm)}</b><small>${H.esc(ok ? cur : hgT('common.state_unavailable'))}</small></span></div>
      <div class="gops" role="radiogroup" aria-label="${H.esc(nm)}">${ops}</div></ha-card>`; }
  onAct(a, t) { if (a !== 'opt') return; const e = this._config.entity; this._pend = t.dataset.o; clearTimeout(this._pt); this._pt = setTimeout(() => { this._pend = null; this.rerender(); }, 3000);
    H.call(this._hass, hgDom(e), 'select_option', { entity_id: e, option: t.dataset.o }); this.rerender(); }
  set hass(h) { const o = this._hass; this._hass = h; if (this._pend != null && o && this._config) { const a = H.st(h, this._config.entity), b = H.st(o, this._config.entity); if (a && b && a.state !== b.state) this._pend = null; } this._update(); }
  get hass() { return this._hass; }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-select-card', HGSelectCard, hgTLazy('cards.select.picker_name'), hgTLazy('cards.select.picker_description'));
