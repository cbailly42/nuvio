/* ===================== ZAKŁADKI: pigułki (Panel / Pokoje / Urządzenia) przełączające zestaw kart ===================== */
class HGTabsCard extends HGStackCard {
  static getStubConfig(h) { return { tabs: [{ label: hgT('cards.tabs.dashboard'), cards: [{ type: 'custom:nuvio-toggle-card', ...HGToggleCard.getStubConfig(h) }] }, { label: hgT('cards.tabs.chart'), cards: [{ type: 'custom:nuvio-chart-card', ...HGChartCard.getStubConfig(h) }] }] }; }
  defaults() { return { tabs: [], glass: true, title: null }; }
  _extraSig() { return [this._tab]; }
  cards() { const T = this._config.tabs || []; return (T[this._tab || 0] || {}).cards || []; }
  key() { return 't' + (this._tab || 0); }
  head() { const c = this._config, T = c.tabs || [], tabs = hgUI.tabs(T.map((t, i) => ({ id: String(i), label: t.label || t.title || hgT('cards.tabs.tab_number', { number: i + 1 }), icon: t.icon })), String(this._tab || 0), 'tab', c.title || hgT('cards.tabs.tabs'));
    return `<div class="tb">${c.title ? hgUI.header(c.title) : ''}${tabs}</div>`; }
  css() { return super.css() + U(`.tb{ display:flex; flex-direction:column; gap:var(--s1); padding:var(--s1) var(--s2) var(--s2); } .flat .tb{ padding:0; } .tb .nv-hd{ padding:0 var(--s1); }`); }
  onAct(a, t) { if (a !== 'tab') return; const i = +t.dataset.id; if (i === (this._tab || 0)) return; this._tab = i; this._anim = true; H.haptic(); this.rerender(); }
}
hgReg('hg-tabs-card', HGTabsCard, hgTLazy('cards.tabs.picker_name'), hgTLazy('cards.tabs.picker_description'));
