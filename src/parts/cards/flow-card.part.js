/* ===================== PRZEPŁYW ENERGII: sieć, panele, bateria i dom na jednym schemacie, kropki płyną po liniach ===================== */
/* Moc w W (kW i MW przeliczane). Sieć: + pobór, − oddawanie (albo osobny czujnik oddawania). Bateria: + rozładowanie, − ładowanie.
   Dom: czujnik zużycia albo bilans (panele + sieć + bateria). Odwrócony znak: invert_grid / invert_battery. */
const HG_FLOW_RX = { grid: /grid|sie[cć]|net\b|meter|licznik|import|pob[oó]r|bilans/i, solar: /\bpv\b|pv_|solar|fotowolt|panel|inverter|falownik|produk/i, battery: /batter|akumul|magazyn|storage/i, home: /home|house|dom\b|zu[zż]yc|consum|load/i };
/* zgadywanie encji dla nowej karty i widoku Energia: czujniki mocy po nazwie, poziom baterii z tego samego urządzenia co moc baterii */
const hgFlowGuess = (h) => { const st = (h && h.states) || {}, R = h.entities || {};
  const pw = Object.keys(st).filter((e) => e.startsWith('sensor.') && st[e].attributes.device_class === 'power' && isFinite(parseFloat(st[e].state)) && !(R[e] && (R[e].hidden || R[e].entity_category)));
  const nm = (e) => e + ' ' + (st[e].attributes.friendly_name || ''), pick = (k, not) => pw.find((e) => HG_FLOW_RX[k].test(nm(e)) && !(not || []).some((r) => HG_FLOW_RX[r].test(nm(e))));
  const solar = pick('solar', ['battery']), battery = pick('battery'), grid = pw.find((e) => e !== solar && e !== battery && HG_FLOW_RX.grid.test(nm(e)) && !HG_FLOW_RX.battery.test(nm(e)));
  const dev = battery && R[battery] && R[battery].device_id;
  const socs = Object.keys(st).filter((e) => e.startsWith('sensor.') && st[e].attributes.device_class === 'battery');
  const soc = battery ? socs.find((e) => dev && R[e] && R[e].device_id === dev) || socs.find((e) => HG_FLOW_RX.battery.test(nm(e)) && !/phone|telefon|iphone|pixel|watch|tablet/i.test(nm(e))) : null;
  return { grid: grid || null, solar: solar || null, battery: battery || null, battery_soc: soc || null }; };
class HGFlowCard extends HGBase {
  static getStubConfig(h) { const g = hgFlowGuess(h); return Object.fromEntries(Object.entries(g).filter(([, v]) => v)); }
  defaults() { return { title: null, icon: 'mdi:transmission-tower-export', grid: null, grid_export: null, solar: null, battery: null, battery_soc: null, home: null, invert_grid: false, invert_battery: false }; }
  ents() { const c = this._config; return [c.grid, c.grid_export, c.solar, c.battery, c.battery_soc, c.home].filter(Boolean); }
  css() { return HG_NV_CSS + U(`
ha-card.glass{ --fl-sun:#F5B53D; --fl-grid:#5AA2FF; --fl-bat:#A78BFA; --fl-home:var(--hg-accent); container-type:inline-size; }
.fs{ position:relative; width:100%; max-width:min(440u, var(--fl-max, 100%)); margin:0 auto; aspect-ratio:var(--ar); flex:none; container-type:inline-size; }
.fs svg{ position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
.tr{ fill:none; stroke:currentColor; stroke-opacity:.13; stroke-width:.7; stroke-linecap:round; transition:stroke var(--hg-t-slow) var(--hg-ease-out), stroke-opacity var(--hg-t-slow) var(--hg-ease-out); }
.tr.on{ stroke:var(--c); stroke-opacity:.32; }
.fl{ fill:none; stroke:var(--c); stroke-width:2.3; stroke-linecap:round; stroke-dasharray:0 6.5; opacity:0; filter:drop-shadow(0 0 1.2px var(--c));
  transition:opacity var(--hg-t-slow) var(--hg-ease-out); animation:flRun var(--d, 1s) linear infinite; animation-play-state:paused; }
.fl.on{ opacity:1; animation-play-state:running; } .fl.rv{ animation-direction:reverse; }
@keyframes flRun{ to{ stroke-dashoffset:-6.5; } }
.nd{ all:unset; box-sizing:border-box; position:absolute; width:20%; aspect-ratio:1; transform:translate(-50%,-50%); border-radius:50%; cursor:pointer;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; text-align:center;
  background:var(--hg-inner-bg); box-shadow:var(--hg-inner-hi); -webkit-backdrop-filter:blur(10px); backdrop-filter:blur(10px);
  transition:box-shadow var(--hg-t-slow) var(--hg-ease-out), transform var(--hg-t-base) var(--hg-spring); }
.nd::before{ content:''; position:absolute; inset:0; border-radius:50%; pointer-events:none;
  background:conic-gradient(from -90deg, var(--ring, color-mix(in srgb, currentColor 14%, transparent) 0 100%));
  -webkit-mask:radial-gradient(farthest-side, transparent calc(100% - 3.5px), #000 calc(100% - 3px)); mask:radial-gradient(farthest-side, transparent calc(100% - 3.5px), #000 calc(100% - 3px)); }
.nd.on{ box-shadow:var(--hg-inner-hi), 0 0 22px color-mix(in srgb, var(--c) 38%, transparent); }
.nd:hover{ transform:translate(-50%,-50%) scale(1.04); } .nd:active{ transform:translate(-50%,-50%) scale(.96); }
.nd:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:3px; }
.nd ha-icon{ width:clamp(16px, 6.4cqw, 30px); height:clamp(16px, 6.4cqw, 30px); --mdc-icon-size:clamp(16px, 6.4cqw, 30px); color:var(--c); transition:color var(--hg-t-slow) var(--hg-ease-out); }
.nd.on.sun ha-icon{ animation:flSpin 24s linear infinite; }
@keyframes flSpin{ to{ transform:rotate(360deg); } }
.nd b{ font-size:clamp(11px, 3.8cqw, 19px); font-weight:600; letter-spacing:-.01em; font-variant-numeric:tabular-nums; white-space:nowrap; line-height:1.1; }
.nd b em{ font-style:normal; font-weight:500; font-size:.72em; opacity:.62; margin-left:1px; }
.nd small{ font-size:clamp(9px, 2.5cqw, 12px); opacity:.62; white-space:nowrap; line-height:1.1; max-width:90%; overflow:hidden; text-overflow:ellipsis; }
.nd.un{ opacity:.5; } .nd.off ha-icon{ color:inherit; opacity:.55; }
.lg{ display:flex; flex-wrap:wrap; justify-content:center; gap:var(--s1) var(--s2); font-size:var(--fs-xs); }
.lg span{ display:inline-flex; align-items:center; gap:5px; padding:3u 9u; border-radius:var(--hg-radius-pill, 999px); background:var(--hg-inner-bg); box-shadow:var(--hg-inner-hi); white-space:nowrap; }
.lg i{ width:7px; height:7px; border-radius:50%; background:var(--c); box-shadow:0 0 6px var(--c); } .lg b{ font-weight:600; font-variant-numeric:tabular-nums; }
@container (max-width: 300px){ .nd small{ display:none; } }
@container (max-width: 240px){ .nd{ width:23%; } .lg{ display:none; } }
@media (prefers-reduced-motion: reduce){ .fl{ animation:none; stroke-dasharray:none; stroke-width:1.1; filter:none; } .fl.on{ opacity:.85; } .nd.on.sun ha-icon{ animation:none; } .nd, .nd:hover, .nd:active{ transition:none; transform:translate(-50%,-50%); } }
`); }
  /* moc encji w W ze znakiem; null = brak encji albo niedostępna */
  _w(e, inv) { if (!e) return null; const v = hgW(this._hass, e); return v == null ? null : inv ? -v : v; }
  model() { const c = this._config, ex = this._w(c.grid_export);
    let G = this._w(c.grid, c.invert_grid); if (c.grid_export && G != null) G = Math.max(0, G) - Math.max(0, ex || 0); else if (G == null && ex != null) G = -Math.max(0, ex);
    const S = c.solar ? Math.max(0, this._w(c.solar) || 0) : 0, B = this._w(c.battery, c.invert_battery) || 0, g = G || 0;
    const hs = this._w(c.home), Hm = hs != null ? Math.abs(hs) : Math.max(0, S + g + B);
    const exp = Math.max(-g, 0), imp = Math.max(g, 0), chg = Math.max(-B, 0), dis = Math.max(B, 0);
    const sg = Math.min(exp, S), sb = Math.min(chg, S - sg), sh = Math.max(S - sg - sb, 0), gb = Math.max(chg - sb, 0), gh = Math.max(imp - gb, 0), bg = Math.max(exp - sg, 0), bh = Math.max(dis - bg, 0);
    return { G, S, B, Hm, sg, sb, sh, gb, gh, bg, bh, soc: c.battery_soc ? H.num(this._hass, c.battery_soc) : null }; }
  /* 650 W albo 2,4 kW */
  fw(w) { if (w == null || !isFinite(w)) return ['–', '']; const a = Math.abs(w); return a < 1000 ? [H.fmt(a, 0), 'W'] : [H.fmt(a / 1000, a < 10000 ? 1 : 0), 'kW']; }
  render() { const c = this._config, h = this._hass, has = { g: !!(c.grid || c.grid_export), s: !!c.solar, b: !!(c.battery || c.battery_soc) };
    const T = c.title || hgTr('Przepływ energii', 'Energy flow');
    if (!has.g && !has.s && !has.b) return `<ha-card class="glass">${hgUI.header(T, { icon: c.icon })}<div class="ph"><b>${hgTr('Brak czujników mocy', 'No power sensors')}</b>${hgTr('Wybierz moc sieci, paneli albo baterii', 'Pick grid, solar or battery power')}</div></ha-card>`;
    const M = this.model(), EPS = 5, top = has.s ? 0 : 27, bot = has.b ? 82 : 56, vh = bot - top, X = { s: [50, 13], g: [13, 42], h: [87, 42], b: [50, 71] };
    const pos = (k) => `left:${X[k][0]}%;top:${((X[k][1] - top) / vh) * 100}%`;
    /* prędkość kropek: kilka poziomów (pierwiastek z kW), żeby drobne wahania mocy nie szarpały animacji */
    const dur = (w) => { const lv = Math.min(6, Math.round(Math.sqrt(w / 1000) * 3)); return (6.5 / (10 + lv * 9)).toFixed(3) + 's'; };
    const P = { gh: 'M23 42 L77 42', sb: 'M50 23 L50 61', sg: 'M43 20 Q16 15 13 32', sh: 'M57 20 Q84 15 87 32', bg: 'M43 64 Q16 69 13 52', bh: 'M57 64 Q84 69 87 52' };
    /* linia: [ścieżka, czy jest, moc, kolor, w przeciwną stronę] */
    const L = [['gh', has.g, M.gh, '--fl-grid'], ['sh', has.s, M.sh, '--fl-sun'], ['bh', has.b, M.bh, '--fl-bat'], ['sg', has.s && has.g, M.sg, '--fl-sun'], ['sb', has.s && has.b, M.sb, '--fl-sun'],
      ['bg', has.b && has.g, M.gb > EPS ? M.gb : M.bg, M.gb > EPS ? '--fl-grid' : '--fl-bat', M.gb > EPS]].filter((l) => l[1]);
    const svg = `<svg viewBox="0 ${top} 100 ${vh}" aria-hidden="true">${L.map(([k, , w, col]) => `<path class="tr${w > EPS ? ' on' : ''}" style="--c:var(${col})" d="${P[k]}"/>`).join('')}
      ${L.map(([k, , w, col, rv]) => `<path class="fl${w > EPS ? ' on' : ''}${rv ? ' rv' : ''}" data-l="${k}" style="--c:var(${col});--d:${dur(w)}" d="${P[k]}"/>`).join('')}</svg>`;
    const un = (e) => e && H.num(h, e) == null;
    /* węzeł: klucz, encja, ikona, kolor, wartość W, podpis, pierścień (conic), aktywny */
    const node = (k, e, ic, col, w, sub, ring, on, lbl) => { const [v, u] = this.fw(w);
      return `<button class="nd ${k === 's' ? 'sun ' : ''}${on ? 'on' : 'off'}${un(e) ? ' un' : ''}" style="${pos(k)};--c:var(${col})${ring ? ';--ring:' + ring : ''}" data-act="more" data-e="${H.esc(e || '')}" aria-label="${H.esc(lbl)}: ${v} ${u}${sub ? ', ' + H.esc(sub) : ''}">
        ${H.icon(ic)}<b>${v}<em>${u}</em></b>${sub ? `<small>${H.esc(sub)}</small>` : ''}</button>`; };
    const full = (col) => `var(${col}) 0 100%`, nds = [];
    if (has.s) nds.push(node('s', c.solar, M.S > EPS ? 'mdi:white-balance-sunny' : 'mdi:solar-panel', '--fl-sun', M.S, hgTr('panele', 'solar'), M.S > EPS ? full('--fl-sun') : '', M.S > EPS, hgTr('Panele', 'Solar')));
    if (has.g) { const ex = (M.G || 0) < -EPS, im = (M.G || 0) > EPS, xc = M.bg > M.sg ? '--fl-bat' : '--fl-sun';
      nds.push(node('g', c.grid || c.grid_export, ex ? 'mdi:transmission-tower-import' : im ? 'mdi:transmission-tower-export' : 'mdi:transmission-tower', ex ? xc : '--fl-grid', M.G == null ? null : Math.abs(M.G),
        ex ? hgTr('oddaje', 'export') : im ? hgTr('pobiera', 'import') : hgTr('sieć', 'grid'), ex ? full(xc) : im ? full('--fl-grid') : '', ex || im, hgTr('Sieć', 'Grid'))); }
    if (has.b) { const ch = M.B < -EPS, ds = M.B > EPS, s = M.soc, lv = s == null ? null : Math.max(0, Math.min(100, s));
      const ic = lv == null ? (ch ? 'mdi:battery-charging' : 'mdi:battery') : ch ? `mdi:battery-charging-${Math.max(10, Math.round(lv / 10) * 10)}` : lv >= 95 ? 'mdi:battery' : lv < 10 ? 'mdi:battery-outline' : `mdi:battery-${Math.floor(lv / 10) * 10}`;
      const sub = lv != null ? H.fmt(lv, 0) + '%' : ch ? hgTr('ładuje', 'charging') : ds ? hgTr('rozładowuje', 'discharging') : hgTr('bateria', 'battery');
      nds.push(node('b', c.battery || c.battery_soc, ic, '--fl-bat', c.battery ? Math.abs(M.B) : null, sub, lv != null ? `var(--fl-bat) 0 ${lv}%, color-mix(in srgb, var(--fl-bat) 16%, transparent) ${lv}% 100%` : ds || ch ? full('--fl-bat') : '', ds || ch, hgTr('Bateria', 'Battery') + (ch ? hgTr(' (ładuje)', ' (charging)') : ds ? hgTr(' (rozładowuje)', ' (discharging)') : ''))); }
    /* dom: pierścień dzielony wg źródeł (panele, sieć, bateria) */
    const src = [['--fl-sun', M.sh, hgTr('Panele', 'Solar'), has.s], ['--fl-grid', M.gh, hgTr('Sieć', 'Grid'), has.g], ['--fl-bat', M.bh, hgTr('Bateria', 'Battery'), has.b]].filter((x) => x[3]), tot = src.reduce((a, x) => a + x[1], 0);
    let acc = 0; const ring = tot > EPS ? src.filter((x) => x[1] > 0).map(([col, w]) => { const a = acc; acc += (w / tot) * 100; return `var(${col}) ${a.toFixed(1)}% ${acc.toFixed(1)}%`; }).join(', ') : '';
    nds.push(node('h', c.home, 'mdi:home-lightning-bolt-outline', '--fl-home', M.Hm, hgTr('dom', 'home'), ring, M.Hm > EPS, hgTr('Dom', 'Home')));
    const own = tot > EPS ? Math.round(((M.sh + M.bh) / tot) * 100) : null;
    const lgs = src.filter((x) => x[1] / tot >= .005), lg = lgs.length > 1 && tot > EPS ? `<div class="lg" role="list" aria-label="${hgTr('Skąd dom bierze prąd', 'Where the home power comes from')}">${lgs.map(([col, w, n]) => `<span role="listitem" style="--c:var(${col})"><i></i>${H.esc(n)} <b>${H.fmt((w / tot) * 100, 0)}%</b></span>`).join('')}</div>` : '';
    this._fitSoon();
    const sum = `${hgTr('Dom', 'Home')} ${this.fw(M.Hm).join(' ')}${own != null && (has.s || has.b) ? ', ' + hgTr('z własnej energii', 'self powered') + ' ' + own + '%' : ''}`;
    return `<ha-card class="glass">${hgUI.header(T, { icon: c.icon, sub: own != null && (has.s || has.b) ? hgTr(`${own}% z własnej energii`, `${own}% self powered`) : '' })}
      <div class="nv-mid"><div class="fs" style="--ar:100/${vh}" role="img" aria-label="${H.esc(sum)}">${svg}${nds.join('')}</div>${lg}</div></ha-card>`; }
  /* schemat mieści się w wysokości kafla: przy stałej wysokości (siatka, sekcje HA) zwęża się zamiast wychodzić poza szkło */
  connectedCallback() { if (super.connectedCallback) super.connectedCallback(); if (!this._ro) this._ro = new ResizeObserver(() => this._fit()); this._ro.observe(this); }
  disconnectedCallback() { if (super.disconnectedCallback) super.disconnectedCallback(); if (this._ro) this._ro.disconnect(); }
  _fitSoon() { cancelAnimationFrame(this._fr); this._fr = requestAnimationFrame(() => this._fit()); }
  _fit() { const card = this.$ && this.$.querySelector('ha-card'), fs = card && card.querySelector('.fs'); if (!fs) return;
    const cs = getComputedStyle(card), hd = card.querySelector('.nv-hd'), lg = card.querySelector('.lg'), mid = fs.parentElement, ar = fs.offsetHeight / (fs.offsetWidth || 1);
    const avail = card.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - (hd ? hd.offsetHeight + (parseFloat(cs.rowGap) || 0) : 0) - (lg ? lg.offsetHeight + (parseFloat(getComputedStyle(mid).rowGap) || 0) : 0);
    const full = Math.min(mid.clientWidth, parseFloat(getComputedStyle(fs).getPropertyValue('--k') || 1) * 440 || mid.clientWidth), need = full * ar;
    const v = avail >= need - 2 || !isFinite(avail) ? '' : Math.max(120, Math.floor(avail / ar)) + 'px';
    if (this.style.getPropertyValue('--fl-max') !== v) { if (v) this.style.setProperty('--fl-max', v); else this.style.removeProperty('--fl-max'); } }
  onAct(a, t) { if (a === 'more' && t.dataset.e) H.fire(this, 'hass-more-info', { entityId: t.dataset.e }); }
  getGridOptions() { return { columns: 12, rows: 5 }; }
}
hgReg('hg-flow-card', HGFlowCard, hgTr('Nuvio – Przepływ energii', 'Nuvio – Energy flow'), hgTr('Sieć, panele, bateria i dom z płynącymi kropkami', 'Grid, solar, battery and home with flowing dots'));
