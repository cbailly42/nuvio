/* --- historia: kilka czujników liczbowych na jednym wykresie --- */
const HG_HC = ['var(--hg-accent)', '#4FB3FF', '#F5B83D', '#FF6B57', '#B48CFF', '#3DD6C6'];
class HGHistoryCard extends HGBase {
  defaults() { return { title: null, entities: [], hours: 24 }; }
  ents() { return this._config.entities || []; }
  css() { return HG_G14_CSS + U(`.ch{ position:relative; flex:1; min-height:110px; } .ch svg{ position:absolute; inset:0; width:100%; height:100%; overflow:visible; } .ch path{ fill:none; stroke-width:2; vector-effect:non-scaling-stroke; stroke-linejoin:round; }
.lg{ display:flex; flex-wrap:wrap; gap:4px 12px; font-size:12px; } .lg span{ display:inline-flex; align-items:center; gap:6px; min-width:0; } .lg i{ width:10px; height:10px; border-radius:3px; flex:none; } .lg b{ font-variant-numeric:tabular-nums; } .ax{ display:flex; justify-content:space-between; font-size:11px; opacity:.55; }`); }
  async _load() { const c = this._config, h = this._hass; if (!h || !c.entities || !c.entities.length || this._ld) return; this._ld = true;
    try { const hrs = +c.hours || 24, r = await Promise.all(c.entities.map((e) => hgHistory(h, e, hrs)));   // wspólna pamięć ui/history
      this._hd = {}; c.entities.forEach((e, i) => { this._hd[e] = r[i]; }); } catch (e) { this._hd = this._hd || {}; } this._ht = Date.now(); this._ld = false; this.rerender(); }
  render() { const c = this._config, h = this._hass, E = (c.entities || []).filter((e) => h.states[e]);
    if (!E.length) return `<ha-card class="glass"><div class="ph"><b>${hgT('cards.history.choose_sensors')}</b>${hgT('cards.history.one_or_more_numeric')}</div></ha-card>`;
    if (!this._ht || Date.now() - this._ht > 300e3) setTimeout(() => this._load(), 0);
    const hrs = +c.hours || 24, t1 = Date.now(), t0 = t1 - hrs * 3600e3, S = E.map((e) => ((this._hd || {})[e] || []).map((p) => [p.t, p.v]).filter((p) => isFinite(p[1])).concat([[t1, H.num(h, e)]]).filter((p) => p[1] != null));
    const all = S.flat(), mn = Math.min(...all.map((p) => p[1])), mx = Math.max(...all.map((p) => p[1])), rg = mx - mn || 1;
    const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${(((Math.max(p[0], t0) - t0) / (t1 - t0)) * 100).toFixed(2)},${(100 - ((p[1] - mn) / rg) * 92 - 4).toFixed(2)}`).join(' ');
    return `<ha-card class="glass">${hgHead('mdi:chart-line', c.title || hgT('cards.history.history'), hgT('cards.history.last_h', { hrs }), true)}
      <div class="ch"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="${hgT('cards.history.history_chart')}">${S.map((p, i) => (p.length > 1 ? `<path d="${path(p)}" style="stroke:${HG_HC[i % HG_HC.length]}"/>` : '')).join('')}</svg></div>
      <div class="ax hide-xs"><span>−${hrs} h</span><span>${H.fmt(mn)} – ${H.fmt(mx)}</span><span>${hgT('common.now')}</span></div>
      <div class="lg">${E.map((e, i) => `<span><i style="background:${HG_HC[i % HG_HC.length]}"></i><span class="nm hide-s" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${H.esc(H.name(h, e))}</span><b>${H.fmt(H.num(h, e))}${H.esc(h.states[e].attributes.unit_of_measurement || '')}</b></span>`).join('')}</div></ha-card>`; }
  getGridOptions() { return { columns: 12, rows: 4 }; }
}
hgReg('hg-history-card', HGHistoryCard, hgTLazy('cards.history.picker_name'), hgTLazy('cards.history.picker_description'));
