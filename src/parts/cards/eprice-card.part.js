/* --- cena prądu: bieżąca cena, słupki godzinowe na dziś / jutro i najtańsze okno; ceny z atrybutów czujnika (Nord Pool, ENTSO-e, Energi Data Service, Pstryk i podobne) --- */
/* jedna doba cen: tablica liczb (Nord Pool today / tomorrow, czas wynika z długości) albo obiektów { start | time | hour, value | price } */
const hgEpDay = (a, day) => { const d0 = new Date(); d0.setHours(0, 0, 0, 0); if (day) d0.setDate(d0.getDate() + 1); const t0 = d0.getTime(), t1 = t0 + 86400000;
  const objs = (L) => L.map((o) => ({ t: Date.parse(o.start || o.time || o.hour || o.startsAt || o.from || o.start_time), v: o.value ?? o.price ?? o.total ?? o.price_gross })).filter((x) => isFinite(x.t) && x.v != null && x.v !== '' && isFinite(+x.v)).map((x) => ({ t: x.t, v: +x.v })).sort((x, y) => x.t - y.t);
  const step = (L) => L.map((x, i) => ({ ...x, d: (L[i + 1] ? L[i + 1].t - x.t : L.length > 1 ? L[1].t - L[0].t : 3600000) || 3600000 }));
  for (const k of day ? ['raw_tomorrow', 'prices_tomorrow', 'tomorrow', 'forecast_tomorrow'] : ['raw_today', 'prices_today', 'today', 'forecast_today']) { const L = a[k]; if (!Array.isArray(L) || !L.length) continue;
    if (typeof L[0] !== 'object' || L[0] === null) { if (L.some((v) => v == null || v === '' || !isFinite(+v))) continue; const d = 86400000 / L.length; return L.map((v, i) => ({ t: t0 + i * d, d, v: +v })); }
    const o = objs(L); if (o.length) return step(o); }
  for (const k of ['prices', 'data', 'forecast']) if (Array.isArray(a[k]) && a[k][0] && typeof a[k][0] === 'object') { const o = objs(a[k]).filter((x) => x.t >= t0 && x.t < t1); if (o.length) return step(o); }
  return []; };
const hgEpHm = (t) => new Date(t).toLocaleTimeString(HG_LOC(), { hour: '2-digit', minute: '2-digit', hour12: false });
class HGEpriceCard extends HGBase {
  static getStubConfig(h) { const S = (h && h.states) || {}; return { entity: Object.keys(S).find((e) => e.startsWith('sensor.') && hgEpDay(S[e].attributes, 0).length) || null }; }
  defaults() { return { entity: null, title: null, window: 3, decimals: 2, unit: null }; }
  _extraSig() { return [this._day, Math.floor(Date.now() / 900000)]; }
  css() { return HG_G14_CSS + U(`
.seg{ display:inline-flex; flex:none; padding:3px; gap:2px; border-radius:999px; background:color-mix(in srgb, currentColor 8%, transparent); }
.seg button{ all:unset; cursor:pointer; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:500; opacity:.7; transition:background-color var(--hg-t-base, 200ms), opacity var(--hg-t-base, 200ms); }
.seg button[aria-pressed=true]{ background:var(--hg-accent); color:var(--hg-on-accent); opacity:1; font-weight:600; } .seg button:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
.nw{ display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; } .nw .big{ font-size:40px; } .nw .mm{ font-size:12px; opacity:.66; font-variant-numeric:tabular-nums; }
.lv{ font-size:12px; font-weight:600; padding:3px 10px; border-radius:999px; color:#111214; background:var(--c); white-space:nowrap; }
.bars{ position:relative; display:flex; align-items:flex-end; gap:1px; height:84px; padding-top:4px; }
.bars i{ flex:1 1 0; min-width:0; border-radius:3px 3px 1px 1px; background:color-mix(in srgb, currentColor 26%, transparent); transition:height .5s cubic-bezier(.2,.8,.2,1); }
.bars i.c{ background:var(--hg-accent); } .bars i.x{ background:#FF8A3D; } .bars i.p{ opacity:.35; }
.bars i.n{ box-shadow:0 0 0 2px var(--hg-tx, currentColor); } .bars i.w{ outline:1.5px dashed color-mix(in srgb, var(--hg-accent) 80%, transparent); outline-offset:1px; }
.bars .zl{ position:absolute; left:0; right:0; border-top:1px dashed color-mix(in srgb, currentColor 35%, transparent); }
.ax{ display:flex; justify-content:space-between; font-size:11px; opacity:.55; font-variant-numeric:tabular-nums; margin-top:-4px; }
.cw{ display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:12px; background:color-mix(in srgb, var(--hg-accent) 14%, transparent); font-size:13px; min-width:0; }
.cw ha-icon{ --mdc-icon-size:18px; width:18px; height:18px; flex:none; color:var(--hg-accent-tx, var(--hg-accent)); } .cw span{ flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .cw b{ flex:none; font-variant-numeric:tabular-nums; }
@container (max-width: 240px){ .nw .big{ font-size:30px; } .nw .mm, .lv{ display:none; } .bars{ height:56px; gap:0; } .seg{ display:none; } .cw{ flex-wrap:wrap; row-gap:2px; } .cw span{ white-space:normal; } }
@media (prefers-reduced-motion:reduce){ .bars i{ transition:none; } }
`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${hgT('cards.eprice.choose_an_electricity_price')}</b>${hgT('cards.eprice.nord_pool_entso_e')}</div></ha-card>`;
    const a = s.attributes, dec = c.decimals != null && c.decimals !== '' ? +c.decimals : 2, unit = c.unit || a.unit_of_measurement || a.unit || '', now = Date.now();
    const T = hgEpDay(a, 0), M = hgEpDay(a, 1), day = this._day && M.length ? 1 : 0, D = day ? M : T;
    const cur = T.find((x) => now >= x.t && now < x.t + x.d), sv = parseFloat(s.state), v = isFinite(sv) ? sv : cur ? cur.v : null;
    const fp = (x) => H.fmt(x, dec);
    const srt = D.map((x) => x.v).sort((p, q) => p - q), q1 = srt[Math.floor(srt.length / 3)], q2 = srt[Math.floor((srt.length * 2) / 3)];
    const ref = T.map((x) => x.v).sort((p, q) => p - q), r1 = ref[Math.floor(ref.length / 3)], r2 = ref[Math.floor((ref.length * 2) / 3)];
    const lv = v == null || !ref.length ? null : v <= r1 ? ['cheap', hgT('cards.eprice.levels.cheap'), 'var(--hg-accent)', hgT('cards.eprice.now.cheap')] : v >= r2 ? ['expensive', hgT('cards.eprice.levels.expensive'), '#FF8A3D', hgT('cards.eprice.now.expensive')] : ['average', hgT('cards.eprice.levels.average'), '#C9CDD2', hgT('cards.eprice.now.average')];   // [poziom, etykieta, kolor, „teraz …”]
    /* najtańsze okno o długości c.window godzin od teraz (dziś i jutro) */
    const fut = [...T, ...M].filter((x) => x.t + x.d > now), wh = Math.max(1, +c.window || 3); let best = null;
    if (fut.length) { const n = Math.max(1, Math.round((wh * 3600000) / fut[0].d)); for (let i = 0; i + n <= fut.length; i++) { const w = fut.slice(i, i + n), av = w.reduce((p, x) => p + x.v, 0) / n; if (!best || av < best.av) best = { t: w[0].t, e: w[n - 1].t + w[n - 1].d, av }; } }
    let bars = '';
    if (D.length) { const mn = Math.min(0, srt[0]), mx = Math.max(srt[srt.length - 1], mn + 1e-9), hp = (x) => Math.max(3, ((x - mn) / (mx - mn)) * 100);
      bars = `<div class="bars" role="img" aria-label="${H.lv(day ? hgT('cards.eprice.prices_tomorrow') : hgT('cards.eprice.prices_today'), `${hgT('cards.eprice.min')} ${fp(srt[0])}, ${hgT('cards.eprice.max')} ${fp(srt[srt.length - 1])} ${H.esc(unit)}`)}">${mn < 0 ? `<span class="zl" style="bottom:${((-mn / (mx - mn)) * 100).toFixed(1)}%"></span>` : ''}${D.map((x) => { const k = [x.v <= q1 ? 'c' : x.v >= q2 ? 'x' : '', !day && x.t + x.d <= now ? 'p' : '', !day && cur && x.t === cur.t ? 'n' : '', best && x.t >= best.t && x.t < best.e ? 'w' : ''].filter(Boolean).join(' ');
        return `<i class="${k}" style="height:${hp(x.v).toFixed(1)}%" title="${hgEpHm(x.t)} · ${fp(x.v)} ${H.esc(unit)}"></i>`; }).join('')}</div><div class="ax" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>`; }
    const avg = srt.length ? srt.reduce((p, x) => p + x, 0) / srt.length : null;
    const seg = M.length ? `<span class="seg" role="group" aria-label="${hgT('cards.eprice.day')}"><button type="button" data-act="day" data-d="0" aria-pressed="${!day}">${hgT('common.today')}</button><button type="button" data-act="day" data-d="1" aria-pressed="${!!day}">${hgT('cards.eprice.tomorrow')}</button></span>` : '';
    return `<ha-card class="glass">${hgHead('mdi:cash-clock', c.title || hgT('cards.eprice.electricity_price'), lv ? lv[3] : '', !!lv && lv[0] === 'cheap', seg)}
      <div class="nw" data-act="more" role="button" tabindex="0" style="cursor:pointer"><span class="big">${v == null ? '–' : fp(v)}${unit ? `<small>${H.esc(unit)}</small>` : ''}</span>${lv ? `<span class="lv" style="--c:${lv[2]}">${H.esc(lv[1])}</span>` : ''}${avg != null ? `<span class="mm">${hgT('cards.eprice.avg')} ${fp(avg)} · ${hgT('cards.eprice.min')} ${fp(srt[0])} · ${hgT('cards.eprice.max')} ${fp(srt[srt.length - 1])}</span>` : ''}</div>
      ${bars || `<div class="ph">${hgT('cards.eprice.the_sensor_has_no')}</div>`}
      ${best ? `<div class="cw">${H.icon('mdi:clock-check-outline')}<span>${H.lv(hgT('cards.eprice.cheapest_h', { wh }), `${hgEpHm(best.t)}–${hgEpHm(best.e)}${new Date(best.t).getDate() !== new Date().getDate() ? ' ' + hgT('cards.eprice.tomorrow_lower') : ''}`)}</span><b>${fp(best.av)}</b></div>` : ''}</ha-card>`; }
  onAct(a, t) { if (a === 'more') return hgMore(this, this._config.entity); if (a === 'day') { this._day = t.dataset.d === '1'; this.rerender(); } }
  getGridOptions() { return { columns: 6, rows: 'auto' }; }
}
hgReg('hg-eprice-card', HGEpriceCard, hgTLazy('cards.eprice.picker_name'), hgTLazy('cards.eprice.picker_description'));
