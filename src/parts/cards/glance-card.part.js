/* ===================== RZUT OKA: kilka encji w rzędzie (ikona, nazwa, stan), jak glance w HA ===================== */
const HG_ON_ST = ['on', 'open', 'unlocked', 'home', 'playing', 'heat', 'cool', 'auto', 'cleaning', 'active', 'detected', 'wet'];
class HGGlanceCard extends HGBase {
  static getStubConfig(h) { return { entities: Object.keys((h && h.states) || {}).filter((e) => ['light', 'switch', 'lock', 'cover', 'binary_sensor'].includes(hgDom(e))).slice(0, 4) }; }
  defaults() { return { entities: [], title: null, show_name: true, show_state: true, columns: null }; }
  ents() { return (this._config.entities || []).map((x) => (typeof x === 'string' ? x : x && x.entity)).filter(Boolean); }
  css() { return HG_NV_CSS + U(`
.gl{ display:grid; grid-template-columns:repeat(var(--nv-c, auto-fit), minmax(64u, 1fr)); gap:var(--s1); }
.gi{ all:unset; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; gap:4u; padding:var(--s1) 2u; border-radius:var(--r-md); cursor:pointer; text-align:center; min-width:0;
  transition: background var(--hg-t-base) var(--hg-ease-out), transform var(--hg-t-fast) var(--hg-ease-out); }
.gi:hover{ background:var(--hg-inner-bg); } .gi:active{ transform:scale(.96); } .gi:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
.gi .nv-ic{ width:38u; height:38u; } .gi .nv-ic ha-icon{ width:19u; height:19u; }
.gi b{ font-size:var(--fs-sm); font-weight:500; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .gi small{ font-size:var(--fs-xs); opacity:.6; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.gi.un{ opacity:.45; }
@container (max-width: 220px){ .gl{ grid-template-columns:repeat(2, minmax(0, 1fr)); } }
`); }
  render() { const c = this._config, h = this._hass, L = (c.entities || []).map((x) => (typeof x === 'string' ? { entity: x } : x)).filter((x) => x && x.entity);
    if (!L.length) return `<ha-card class="glass"><span class="nv-empty">${hgT('cards.glance.choose_entities')}</span></ha-card>`;
    const n = Math.round(+c.columns) || 0;
    return `<ha-card class="glass">${c.title ? hgUI.header(c.title) : ''}<div class="gl" style="${n ? `--nv-c:${Math.min(8, n)}` : ''}">${L.map((x) => { const s = H.st(h, x.entity), nm = x.name || H.name(h, x.entity), on = !!s && HG_ON_ST.includes(s.state);
      const ic = x.icon || (s && s.attributes.icon) || HG_DOM_ICON2[hgDom(x.entity)] || 'mdi:circle-outline';
      return `<button class="gi ${s && H.ok(s) ? '' : 'un'}" data-act="more" data-e="${H.esc(x.entity)}" data-key="${H.esc(x.entity)}" aria-label="${H.esc(nm)}${s ? ', ' + H.esc(H.T(h, s)) : ''}"><span class="nv-ic ${on ? 'on' : ''}">${H.icon(ic)}</span>${c.show_name !== false ? `<b>${H.esc(nm)}</b>` : ''}${c.show_state !== false ? `<small>${s ? H.esc(H.T(h, s)) : hgT('cards.glance.missing')}</small>` : ''}</button>`; }).join('')}</div></ha-card>`; }
  onAct(a, t) { if (a === 'more') H.fire(this, 'hass-more-info', { entityId: t.dataset.e }); }
  getGridOptions() { return { columns: 12, rows: 2 }; }
}
hgReg('hg-glance-card', HGGlanceCard, hgTLazy('cards.glance.picker_name'), hgTLazy('cards.glance.picker_description'));
