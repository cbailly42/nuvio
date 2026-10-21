/* ===================== STATYSTYKA: minimum, średnia, maksimum i zmiana czujnika za 24 h, 7 albo 30 dni ===================== */
class HGStatCard extends HGBase {
  static getStubConfig(h) { return { entity: hgStub(h, ['sensor'], hgNum) || null }; }
  defaults() { return { entity: null, name: null, icon: null, hours: 24, decimals: 1 }; }
  css() { return HG_NV_CSS + U(`
.st{ display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:var(--s1); }
.st div{ display:flex; flex-direction:column; gap:2u; padding:var(--s1); border-radius:var(--r-sm); background:var(--hg-inner-bg); box-shadow:var(--hg-inner-hi); min-width:0; }
.st small{ font-size:var(--fs-xs); opacity:.6; } .st b{ font-size:var(--fs-md); font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .st b.up{ color:var(--hg-accent-tx); }
.pp{ display:flex; gap:4u; flex-wrap:wrap; }
@container (max-width: 420px){ .st{ grid-template-columns:repeat(2, minmax(0, 1fr)); } }
`); }
  hrs() { return this._hrs || +this._config.hours || 24; }
  _extraSig() { return [this._hrs, this._k]; }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><span class="nv-empty">${hgT('cards.stat.choose_a_numeric_sensor')}</span></ha-card>`;
    this._load(); const u = s.attributes.unit_of_measurement || '', d = +c.decimals, v = parseFloat(s.state), R = this._r, f = (x) => (isFinite(x) ? H.fmt(x, d) + (u ? ' ' + u : '') : '–');
    const per = [[24, '24 h'], [168, hgT('cards.stat.7_days')], [720, hgT('cards.stat.30_days')]], hr = this.hrs();
    const dl = R && isFinite(R.first) && isFinite(v) ? v - R.first : NaN;
    const body = !R ? `<span class="nv-empty">${hgT('common.loading')}</span>` : !R.n ? `<span class="nv-empty">${hgT('cards.stat.no_history_in_this')}</span>`
      : `<div class="st"><div><small>${hgT('cards.stat.minimum')}</small><b>${f(R.min)}</b></div><div><small>${hgT('cards.stat.average')}</small><b>${f(R.avg)}</b></div><div><small>${hgT('cards.stat.maximum')}</small><b>${f(R.max)}</b></div><div><small>${hgT('cards.stat.change')}</small><b class="${dl > 0 ? 'up' : ''}">${isFinite(dl) ? (dl > 0 ? '+' : '') + f(dl) : '–'}</b></div></div>${R.pts.filter(isFinite).length > 1 ? `<div class="hide-s">${hgUI.spark(R.pts, { axis: [per.find((p) => p[0] === hr) ? '-' + per.find((p) => p[0] === hr)[1] : `-${hr} h`, hgT('common.now')] })}</div>` : ''}`;
    return `<ha-card class="glass ${H.ok(s) ? '' : 'un'}">${hgUI.header(c.name || H.name(h, c.entity), { icon: c.icon || s.attributes.icon, right: hgUI.iconBtn('mdi:arrow-expand', 'more', hgT('common.details'), { bare: true, size: 'sm' }) })}
      ${hgUI.big(isFinite(v) ? v : null, { d, unit: u, caption: H.ok(s) ? '' : H.t(h, s) })}<div class="nv-mid">${body}</div>
      <div class="pp" role="group" aria-label="${hgT('cards.stat.period')}">${per.map(([x, l]) => hgUI.pill(l, { act: 'per', on: x === hr, data: { h: x } })).join('')}</div></ha-card>`; }
  _load() { const c = this._config, hr = this.hrs(), k = c.entity + '|' + hr; if (this._lk === k && Date.now() - this._ld < 5 * 60e3) return; this._lk = k; this._ld = Date.now();
    hgHistory(this._hass, c.entity, hr).then((P) => { if (this._lk !== k) return; const t0 = Date.now() - hr * 3600e3, inP = P.filter((p) => p.t >= t0), base = P.filter((p) => p.t < t0).pop(), vs = (base ? [base, ...inP] : inP).map((p) => p.v);
      const pts = hgBuckets(P, hr, 48), ok = pts.filter(isFinite);
      this._r = { n: vs.length, min: vs.length ? Math.min(...vs) : NaN, max: vs.length ? Math.max(...vs) : NaN, avg: ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : NaN, first: vs.length ? vs[0] : NaN, pts };
      this._k = k; this.rerender(); }); }
  onAct(a, t) { if (a === 'per') { this._hrs = +t.dataset.h; this._r = null; return this.rerender(); } if (a === 'more') H.fire(this, 'hass-more-info', { entityId: this._config.entity }); }
  getGridOptions() { return { columns: 6, rows: 3 }; }
}
hgReg('hg-stat-card', HGStatCard, hgTLazy('cards.stat.picker_name'), hgTLazy('cards.stat.picker_description'));
