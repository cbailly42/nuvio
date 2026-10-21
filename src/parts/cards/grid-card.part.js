/* ===================== SIATKA: karty w kolumnach jak grid w HA (columns, square), dziecko z rozpiętością span =====================
   columns: 1–6 albo 'auto' (tyle kolumn, ile zmieści się po min_width px). Na wąskim panelu mniej kolumn (container queries).
   glass: false (domyślnie) = każda karta ma własne szkło jak w HA; true = jedno szkło na całą siatkę. */
class HGGridCard extends HGStackCard {
  static getStubConfig(h) { const t = { type: 'custom:nuvio-toggle-card', ...HGToggleCard.getStubConfig(h) }; return { columns: 2, cards: [t, { type: 'custom:nuvio-progress-card', ...HGProgressCard.getStubConfig(h) }, { ...t, span: 2 }] }; }
  defaults() { return { cards: [], columns: 3, square: false, glass: false, title: null, gap: null, min_width: 160 }; }
  css() { return super.css() + U(`
.bd.gr{ display:grid; gap:var(--nv-gap, var(--s2)); grid-template-columns:repeat(var(--nv-c, 3), minmax(0, 1fr)); grid-auto-flow:row dense; align-items:stretch; }
.glass:not(.flat) .bd.gr{ padding:var(--s1) var(--s2) var(--s2); }
.bd.gr.au{ grid-template-columns:repeat(auto-fill, minmax(min(var(--nv-mw, 160px), 100%), 1fr)); }
.bd.gr > .sl{ flex:none; grid-column:span var(--sp, 1); } .bd.gr > .sl::before{ display:none !important; }
.bd.gr.sq > .sl{ aspect-ratio:1; } .bd.gr.sq > .sl > *{ height:100%; }
@container (max-width: 520px){ .bd.gr.c4, .bd.gr.c5, .bd.gr.c6{ --nv-c:3; } }
@container (max-width: 420px){ .bd.gr.c3, .bd.gr.c4, .bd.gr.c5, .bd.gr.c6{ --nv-c:2; } .bd.gr > .sl.w{ grid-column:1 / -1; } }
@container (max-width: 240px){ .bd.gr{ --nv-c:1 !important; grid-template-columns:minmax(0, 1fr); } .bd.gr > .sl{ grid-column:auto !important; } }
`); }
  cols() { const c = this._config.columns; return c === 'auto' ? 0 : Math.max(1, Math.min(6, Math.round(+c || 3))); }
  bodyCls() { const n = this.cols(); return `gr ${n ? 'c' + n : 'au'} ${this._config.square ? 'sq' : ''}`; }
  styleVars() { const c = this._config, V = [`--nv-c:${this.cols() || 3}`]; if (c.gap != null && c.gap !== '' && isFinite(+c.gap)) V.push(`--nv-gap:${+c.gap}px`); if (this.cols() === 0) V.push(`--nv-mw:${+c.min_width || 160}px`); return V.join(';'); }
  slot(x, i) { const n = this.cols() || 6, sp = Math.max(1, Math.min(n, Math.round(+(x && x.span) || 1))); return `<div class="sl${sp > 1 ? ' w' : ''}" data-own data-key="${this.key()}-${i}" style="--i:${i};--sp:${sp}"></div>`; }
  key() { return 'g'; }
  _narrowSet() {}
  getGridOptions() { return { columns: 12, rows: 'auto' }; }
}
hgReg('hg-grid-card', HGGridCard, hgTLazy('cards.grid.picker_name'), hgTLazy('cards.grid.picker_description'));
