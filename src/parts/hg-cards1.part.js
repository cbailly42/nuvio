/* moc w W wg unit_of_measurement (W / kW / MW) – wspólne dla kart mocy */
const hgW = (hass, e) => { const v = H.num(hass, e); if (v == null) return null; const u = String(H.st(hass, e).attributes.unit_of_measurement || '').trim(); return u === 'kW' ? v * 1000 : u === 'MW' ? v * 1e6 : v; };
/* scalanie konfiguracji: zagnieżdżone obiekty domyślne (progi, etykiety, kolory) uzupełniane kluczami, nie zastępowane w całości */
const hgDeep = (d, c) => { if (!c) return c; const o = Object.assign({}, c); for (const k in d) { const a = d[k], b = c[k]; if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) o[k] = Object.assign({}, a, b); } return o; };
/* liczba kluczy obiektu (hass.states / hass.entities) liczona raz na referencję – wspólna dla kart z wykrywaniem encji */
const hgNKeysM = new WeakMap(), hgNKeys = (o) => { let n = hgNKeysM.get(o); if (n == null) { n = Object.keys(o).length; hgNKeysM.set(o, n); } return n; };
/* ===================== ENERGIA ===================== */
class HGEnergyCard extends HGBase {
  defaults() {
    return { title: hgTr('Energia', 'Energy'), icon: 'mdi:star-four-points', entities: [], max_power: 17250, thresholds: { low: 30, high: 70 },
      labels: { low: hgTr('Niskie zużycie', 'Low usage'), medium: hgTr('Średnie zużycie', 'Medium usage'), high: hgTr('Wysokie zużycie', 'High usage') }, expand: null,
      calc_label: hgTr('Suma faz względem mocy maksymalnej', 'Sum of phases vs. maximum power') };
  }
  setConfig(c) { super.setConfig(hgDeep(this.defaults(), c)); }
  ents() { return this._config.entities; }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; padding:var(--s2) var(--s3) var(--s3); }
.hd .ic{ color:var(--hg-accent-tx); width:11u; height:11u; }
.sub{ font-size:var(--fs-sm); font-weight:400; margin-top:5u; }
.grow{ flex:1; min-height:6u; }
.scale{ display:flex; justify-content:space-between; font-size:var(--fs-sm); color:#2B2E33; padding:0 1u; margin-bottom:7u; }
.bar{ position:relative; height:46u; border-radius:var(--r-sm); background:#fff; overflow:hidden; }
.fill{ position:absolute; left:0; top:0; bottom:0; border-radius:var(--r-sm); background:var(--hg-accent); min-width:18u; transition: width .6s cubic-bezier(.3,.7,.3,1); }
.fill i{ position:absolute; right:12u; top:30%; bottom:30%; width:2u; border-radius:2u; background:#fff; }
/* compact: wiersz „Moc teraz” z cienkim paskiem (główny widok) */
ha-card.glass.cmp{ padding:var(--s2) var(--s3) var(--s2); gap:0; }
.cmp .row{ display:flex; align-items:baseline; gap:var(--s1); margin-top:6u; }
.cmp .row b{ font-size:calc(17u * var(--hg-fsv, 1)); font-weight:600; letter-spacing:-.01em; } .cmp .row span{ font-size:var(--fs-sm); color:#5A5E64; }
.cmp .bar{ height:10u; border-radius:5u; margin-top:8u; } .cmp .fill{ border-radius:5u; min-width:6u; } .cmp .fill i{ display:none; }
`);
  }
  data() {
    const c = this._config; let tot = 0, n = 0;
    for (const e of c.entities) { const v = hgW(this._hass, e); if (v != null) { tot += Math.abs(v); n++; } }   // obciążenie fazy = |P| (eksport PV też płynie przez zabezpieczenie)
    if (!n) return null;
    const pct = Math.max(0, Math.min(100, (tot / c.max_power) * 100));
    return { tot, pct, lvl: pct < c.thresholds.low ? 'low' : pct < c.thresholds.high ? 'medium' : 'high' };
  }
  render() {
    const c = this._config, d = this.data();
    const hd = `<div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><span class="sp"></span>
      ${c.expand ? `<button class="ib" data-act="expand" aria-label="${hgTr('Rozwiń', 'Expand')}" title="${hgTr('Szczegóły', 'Details')}">${H.icon('mdi:arrow-expand')}</button>` : ''}</div>`;
    if (!d) return `<ha-card class="glass warm">${hd}<div class="ph"><b>${hgTr('Brak źródła danych', 'No data source')}</b>${hgTr('Czujniki mocy niedostępne', 'Power sensors unavailable')}</div></ha-card>`;
    const pr = Math.round(d.pct);
    if (c.compact) {
      const kw = d.tot >= 1000 ? `${H.fmt(d.tot / 1000, 2)} kW` : `${H.fmt(d.tot, 0)} W`;
      return `<ha-card class="glass warm cmp" title="${H.esc(`${c.calc_label}: ${H.fmt(d.tot, 0)} W ${hgTr('z', 'of')} ${H.fmt(c.max_power / 1000, 2)} kW`)}">${hd}
        <div class="row"><b>${kw}</b><span>${pr}% · ${H.esc(c.labels[d.lvl])}</span></div>
        <div class="bar" role="meter" aria-label="${hgTr('Obciążenie', 'Load')}" aria-valuenow="${pr}" aria-valuemin="0" aria-valuemax="100"><div class="fill" style="width:${d.pct.toFixed(1)}%"><i></i></div></div></ha-card>`;
    }
    const tip = `${c.calc_label}: ${c.entities.map((e) => `${H.name(this._hass, e)} ${H.fmt(Math.abs(hgW(this._hass, e) || 0), 0)} W`).join(' + ')} = ${H.fmt(d.tot, 0)} W ${hgTr('z', 'of')} ${H.fmt(c.max_power / 1000, 2)} kW`;
    return `<ha-card class="glass warm" title="${H.esc(tip)}">${hd}
      <div class="sub">${pr}% · ${H.esc(c.labels[d.lvl])}</div><div class="grow"></div>
      <div class="scale"><span>0</span><span>50</span><span>100</span></div>
      <div class="bar" role="meter" aria-label="${hgTr('Obciążenie', 'Load')}" aria-valuenow="${pr}" aria-valuemin="0" aria-valuemax="100"><div class="fill" style="width:${d.pct.toFixed(1)}%"><i></i></div></div></ha-card>`;
  }
  onAct(a) { if (a === 'expand') H.action(this, this._hass, this._config.expand); }
}
hgReg('hg-energy-card', HGEnergyCard, hgTr('Home Glass – Energia', 'Home Glass – Energy'), hgTr('Procent obciążenia mocy (suma faz / moc maks.)', 'Power load percentage (sum of phases / max power)'));

/* ===================== KLIMATYZACJA ===================== */
/* stan widoczny od razu, bez zmiany powierzchni szkła: mała pełna kropka trybu z ikoną (subtelna animacja), aktywny chip,
   podświetlenie łuku i tekst „Chłodzi · 21°”. Wyłączona: wszystko szare i przygaszone. Dotknięcie: stan od razu (optymistycznie),
   potwierdzenie z HA (albo powrót po 8 s, gdy HA nie potwierdzi). */
const HG_AC_MODE = {
  /* c: wypełnienie aktywnego przycisku trybu, on: ikona/tekst na nim, t: token koloru tekstu statusu (kontrast w obu schematach) */
  cool: { c: 'var(--hg-accent)', on: 'var(--hg-accent-tx)', i: 'mdi:snowflake', t: 'cool', get l() { return hgTr('Chłodzenie', 'Cooling'); } }, heat: { c: 'var(--hg-accent)', on: '#1E2023', i: 'mdi:fire', t: 'heat', get l() { return hgTr('Grzanie', 'Heating'); } },
  dry: { c: '#A3A9B1', on: '#1E2023', i: 'mdi:water-percent', t: 'neu', get l() { return hgTr('Osuszanie', 'Drying'); } }, fan_only: { c: '#A3A9B1', on: '#1E2023', i: 'mdi:fan', t: 'neu', get l() { return hgTr('Wentylacja', 'Fan only'); } },
  heat_cool: { c: 'var(--hg-accent)', on: 'var(--hg-accent-tx)', i: 'mdi:thermostat-auto', t: 'auto', l: 'Auto' }, auto: { c: 'var(--hg-accent)', on: 'var(--hg-accent-tx)', i: 'mdi:thermostat-auto', t: 'auto', l: 'Auto' },
  off: { c: '#C4C8CE', on: '#5A5E64', i: 'mdi:power', t: 'neu', get l() { return hgTr('Wyłączona', 'Off'); } },
};
const HG_FAN_PL = { auto: 'Auto', low: 'Niski', medium: 'Średni', middle: 'Średni', mid: 'Średni', high: 'Wysoki', quiet: 'Cichy', silent: 'Cichy', turbo: 'Turbo', strong: 'Mocny', diffuse: 'Rozproszony', focus: 'Skupiony', on: 'Wł.', off: 'Wył.' };
const HG_SWING_PL = { off: 'Stały', on: 'Ruch', horizontal: 'Poziomo', vertical: 'Pionowo', both: 'Oba', swing: 'Ruch' };
const HG_FAN_EN = { auto: 'Auto', low: 'Low', medium: 'Medium', middle: 'Medium', mid: 'Medium', high: 'High', quiet: 'Quiet', silent: 'Silent', turbo: 'Turbo', strong: 'Strong', diffuse: 'Diffuse', focus: 'Focus', on: 'On', off: 'Off' };
const HG_SWING_EN = { off: 'Fixed', on: 'Swing', horizontal: 'Horizontal', vertical: 'Vertical', both: 'Both', swing: 'Swing' };
/* Klimatyzacja w stylu aplikacji Tesla: duża temperatura z chevronami, pasek temperatury (przeciągany), rząd dużych przycisków trybów */
class HGACCard extends HGBase {
  defaults() {
    return { title: hgTr('Klimatyzacja', 'Air conditioning'), compact: false,
      modes: [{ mode: 'heat_cool', label: 'Auto' }, { mode: 'auto', label: 'Auto' }, { mode: 'cool', label: hgTr('Chłodzenie', 'Cooling'), short: hgTr('Chłodz.', 'Cool') }, { mode: 'heat', label: hgTr('Grzanie', 'Heating') },
        { mode: 'dry', label: hgTr('Osuszanie', 'Drying'), short: hgTr('Osusz.', 'Dry') }, { mode: 'fan_only', label: hgTr('Wiatr', 'Fan') }],
      compact_modes: ['cool', 'heat', 'fan_only', 'heat_cool', 'auto'], room_label: hgTr('Wnętrze', 'Indoor') };
  }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; container-type:inline-size; padding:14px var(--s2); gap:var(--s1); min-height:0; user-select:none; -webkit-user-select:none; }
ha-card.glass > *{ flex-shrink:0; }
.hd{ min-height:32px; gap:var(--s1); } .hd .tt{ font-size:var(--fs-sm); font-weight:600; color:#2A2D31; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .hd .tt span{ font-weight:400; color:#5A5E64; }
/* temperatura */
.temp{ flex:1 0 auto; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-height:0; }
.temp + .bw{ margin-top:-6px; }
.lab{ font-size:var(--fs-xs); letter-spacing:.12em; text-transform:uppercase; color:#5A5E64; font-variant-numeric:tabular-nums; white-space:nowrap; }
.tr{ display:grid; grid-template-columns:var(--cv, 56px) minmax(0, auto) var(--cv, 56px); align-items:center; justify-content:center; gap:var(--s1); width:100%; }
.num{ font-size:var(--ts, 72px); font-weight:200; letter-spacing:-.04em; line-height:1; color:#16181B; font-variant-numeric:tabular-nums; text-align:center; white-space:nowrap; transition: color .2s; padding-right:.18em; position:relative; }
.num sup{ position:absolute; top:.06em; right:0; font-size:.34em; font-weight:400; }
.cv{ width:var(--cv, 56px); height:var(--cv, 56px); border-radius:50%; display:flex; align-items:center; justify-content:center; background:transparent; color:#2A2D31; transition: background .15s, transform .1s; touch-action:manipulation; }
.cv ha-icon{ width:32px; height:32px; --mdc-icon-size:32px; } .cv:active, .cv.prs{ background:rgba(0,0,0,.06); } .cv[disabled]{ opacity:.3; }
@media (hover:hover) and (pointer:fine){ .cv:not([disabled]):hover{ background:rgba(0,0,0,.04); } }
.st{ font-size:var(--fs-sm); font-weight:600; color:var(--mt); white-space:nowrap; transition: color .2s; }
/* pasek temperatury: zimny błękit -> ciepły pomarańcz (min..max), gałka nastawy, kreska bieżącej */
.bw{ display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:var(--s1); }
.bw small{ font-size:var(--fs-xs); color:#5A5E64; font-variant-numeric:tabular-nums; }
.bar{ position:relative; height:44px; cursor:pointer; touch-action:pan-y; outline:none; }
.temp .num{ cursor:pointer; -webkit-tap-highlight-color:transparent; }
.bar .tk{ position:absolute; left:0; right:0; top:10px; height:24px; background:repeating-linear-gradient(90deg, rgba(128,134,140,.55) 0 1px, transparent 1px calc(100% / 28)); -webkit-mask:linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); mask:linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); transition: opacity .2s; }
.bar .cu{ position:absolute; top:8px; width:2px; height:28px; margin-left:-1px; border-radius:1px; background:var(--hg-accent); opacity:.9; left:var(--pc); }
.bar .kn{ position:absolute; top:0; left:var(--pp); width:22px; height:44px; margin-left:-11px; border-radius:11px; background:var(--hg-tile-bg); -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px); box-shadow:0 4px 14px rgba(0,0,0,.22); transition: transform .12s; }
.bar .kn::before{ content:''; position:absolute; left:50%; top:9px; bottom:9px; width:2px; margin-left:-1px; border-radius:1px; background:var(--hg-ink, #000); opacity:.75; }
.bar.drag .kn{ transform:scale(1.15); } .bar:focus-visible .kn{ outline:2px solid var(--hg-accent); outline-offset:2px; }
/* przyciski trybów (styl dolnych kontrolek Tesli) */
.mr{ display:grid; grid-template-columns:repeat(auto-fit, minmax(max(var(--bs, 56px), calc((100% - 3 * var(--s1)) / 4)), 1fr)); gap:var(--s1); }
.mb i em{ display:block; font-style:normal; font-size:11px; font-weight:600; line-height:1.1; max-width:calc(100% - 6px); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .mb i.v{ flex-direction:column; gap:0; } .mb i.v ha-icon{ width:16px; height:16px; --mdc-icon-size:16px; } .mb i.v em{ font-size:10px; }
.mb{ display:flex; flex-direction:column; align-items:center; gap:4px; min-width:0; font-size:var(--fs-xs); line-height:1.15; color:#4A4E54; }
.mb i{ width:var(--bs, 56px); height:var(--bs, 56px); border-radius:var(--r-md); display:flex; align-items:center; justify-content:center; background:var(--hg-tile-bg); color:#2A2D31; font-style:normal; transition: background .2s, color .2s, transform .1s; }
.mb i ha-icon{ width:24px; height:24px; --mdc-icon-size:24px; } .mb:active i{ transform:scale(.94); }
.mb span{ max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .mb .sh{ display:none; }
.mb.act i{ background:var(--hg-accent-soft); color:var(--hg-accent-tx); box-shadow:0 0 18px var(--hg-accent-faint); } .mb.act{ color:#1E2023; font-weight:600; }
.mb.pw.on i{ background:rgba(0,0,0,.08); color:#1E2023; } .mb.pw.off i{ background:#6A6E74; color:#FFFFFF; } .mb.pw.off{ color:#1E2023; font-weight:600; }
.tight .mb span{ display:none; } .nolab .lab, .nolab .bw small{ display:none; } .nolab .bw{ grid-template-columns:1fr; }
/* desktop bez przewijania: rozwinięte tryby jako warstwa nad temperaturą (karta ma stałą wysokość) */
.ov .xp{ position:absolute; left:var(--s2); right:var(--s2); top:var(--xt, 48px); bottom:var(--xbm, 90px); display:block; z-index:3; border-radius:var(--r-md); padding:var(--s1);
  background:var(--hg-ov-bg); box-shadow:0 8px 24px rgba(0,0,0,.18); overflow:auto; scrollbar-width:none;
  opacity:0; transform:translateY(8px) scale(.98); visibility:hidden; transition: opacity .18s ease, transform .18s ease, visibility 0s linear .18s; }
.ov .xp.open{ opacity:1; transform:none; visibility:visible; transition: opacity .18s ease, transform .18s ease; }
.ov .xi{ overflow:visible; } .ov .xi > *{ opacity:1; transform:none; padding-top:0; } .ovt .xp .mb span{ display:none; }
.mw{ display:flex; flex-direction:column; }
.mr.top{ grid-template-columns:repeat(auto-fit, minmax(var(--bs, 56px), calc((100% - 3 * var(--s1)) / 4))); justify-content:start; }
.xp{ display:grid; grid-template-rows:0fr; transition: grid-template-rows .18s ease; } .xp.open{ grid-template-rows:1fr; }
.xi{ min-height:0; overflow:hidden; } .xi > *{ padding-top:var(--s1); opacity:0; transform:translateY(-6px); transition: opacity .18s ease, transform .18s ease; } .xp.open .xi > *{ opacity:1; transform:none; }
.xb i ha-icon{ transition: transform .18s ease; } .xb[aria-expanded=true] i ha-icon{ transform:rotate(180deg); } .xb[aria-expanded=true] i{ background:rgba(0,0,0,.08); }
.xp.open ~ * .fanc, .mw:has(.xp.open) .fanc{ display:none; }
@container (max-width: 268px){ .fanc{ display:none; } }
@media (prefers-reduced-motion: reduce){ .xp, .xi > *, .xb i ha-icon{ transition:none; } }
.mm.mx{ flex-wrap:wrap; }
@container (max-width: 460px){ .mb .fl{ display:none; } .mb .sh{ display:inline; } }
/* wyłączona */
.off .num{ color:#6A6E74; } .off .bar .tk{ background:rgba(0,0,0,.12); } .off .bar .kn{ box-shadow:0 0 0 1px rgba(0,0,0,.12); background:#E4E6E9; }
/* ----- kompakt (strony pokoi) ----- */
.c1{ display:flex; align-items:center; gap:var(--s1); min-height:44px; }
.c1 .nm{ flex:1; min-width:0; display:flex; flex-direction:column; line-height:1.25; }
.c1 .nm b{ font-size:var(--fs-sm); font-weight:600; color:#1E2023; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.c1 .nm span{ font-size:var(--fs-xs); font-weight:600; color:var(--mt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.c1 .tr{ width:auto; grid-template-columns:44px auto 44px; gap:0; }
.c1 .cv{ width:44px; height:44px; } .c1 .cv ha-icon{ width:24px; height:24px; --mdc-icon-size:24px; }
.c1 .num{ font-size:32px; }
/* wąski kafel (S): nazwa i stan w pełnych dwóch liniach nad nastawą, mniejsza temperatura */
@container (max-width: 340px){ .c1{ flex-wrap:wrap; row-gap:4px; } .c1 .nm{ flex:1 1 100%; } .c1 .nm b, .c1 .nm span{ white-space:normal; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; } .c1 .tr{ margin:0 auto; } .c1 .num{ font-size:28px; } }
.c2{ display:flex; align-items:center; gap:var(--s1); } .c2 .bar{ flex:1; } .c2 .kb{ margin-left:auto; }
.mm{ display:flex; gap:6px; flex:none; } .mm .mb span{ display:none; } .mm .mb i{ width:44px; height:44px; border-radius:var(--r-sm); } .mm .mb i ha-icon{ width:20px; height:20px; --mdc-icon-size:20px; }
.num.rng{ font-size:calc(var(--ts, 72px) * .55); } .c1 .num.rng{ font-size:22px; }
`);
  }
  _eff(s) {
    const o = this._opt, a = s.attributes;
    let st = s.state, t = a.temperature != null ? Number(a.temperature) : null;
    if (o) {
      const done = (o.state == null || o.state === s.state || (o.any && s.state !== 'off')) && (o.t == null || o.t === t);
      if (done || Date.now() - o.ts > 8000) this._opt = null;
      else { if (o.state != null) st = o.state; if (o.t != null) t = o.t; }
    }
    return { st, t };
  }
  _extraSig() { return this._opt ? JSON.stringify(this._opt) : ''; }
  _room() {
    const c = this._config, h = this._hass; if (c.room !== undefined) return c.room;
    const e = h.entities && h.entities[c.entity], dv = e && e.device_id && h.devices ? h.devices[e.device_id] : null, ar = (e && e.area_id) || (dv && dv.area_id);
    return ar && h.areas && h.areas[ar] ? h.areas[ar].name : '';
  }
  _lim(s) { const a = s.attributes, cf = this._hass && this._hass.config, f = !!(cf && cf.unit_system && cf.unit_system.temperature === '°F'); return { step: a.target_temp_step || (f ? 1 : 0.5), mn: a.min_temp ?? 16, mx: a.max_temp ?? 30 }; }
  _stat(st, t) { const m = HG_AC_MODE[st] || HG_AC_MODE.cool; if (st === 'off') return hgTr('Wyłączona', 'Off'); return (st === 'fan_only' || st === 'dry' || t == null) ? m.l : hgTr(`${m.l} do ${H.fmt(t)}°`, `${m.l} to ${H.fmt(t)}°`); }
  render() {
    const c = this._config, h = this._hass, s = H.st(h, c.entity);
    const kb = `<button class="ib kebab kb" data-act="more" aria-label="${hgTr('Więcej', 'More')}" title="${hgTr('Więcej', 'More')}">${H.icon('mdi:dots-vertical')}</button>`;
    if (!H.ok(s)) return `<ha-card class="glass off ${c.compact ? 'compact' : ''}" style="--mt:var(--hg-ac-neu-tx)"><div class="hd"><span class="tt">${H.esc(c.title)}</span><span class="sp"></span>${kb}</div><div class="ph"><b>${hgTr('Niedostępna', 'Unavailable')}</b></div></ha-card>`;
    const a = s.attributes, { st, t } = this._eff(s), on = st !== 'off';
    if (s.state !== 'off') this._last = s.state;
    const m = HG_AC_MODE[st] || HG_AC_MODE.cool, { mn, mx } = this._lim(s);
    const cur = a.current_temperature != null ? Number(a.current_temperature) : null;
    const fr = (v) => Math.max(0, Math.min(1, (v - mn) / (mx - mn)));
    const hv = a.hvac_modes || [], seen = new Set();
    const modes = c.modes.filter((x) => hv.includes(x.mode) && !seen.has(x.label) && seen.add(x.label));
    const sty = `--mc:${m.c};--mo:${m.on};--mt:var(--hg-ac-${m.t}-tx);--pp:${t != null ? (fr(t) * 100).toFixed(2) : 0}%;--pc:${cur != null ? (fr(cur) * 100).toFixed(2) : 0}%`;
    const rng = t == null && a.target_temp_low != null && a.target_temp_high != null;   // heat_cool z zakresem: tylko podgląd (bez przeciągania i chevronów)
    const num = `<div class="num${rng ? ' rng' : ''}" data-act="ctr" aria-live="polite" title="${on ? hgTr('Przytrzymaj: szczegóły', 'Hold: details') : hgTr('Dotknij, aby włączyć', 'Tap to turn on')}">${t != null ? H.fmt(t) : rng ? `${H.fmt(a.target_temp_low)}–${H.fmt(a.target_temp_high)}` : '–'}<sup>°</sup></div>`;
    const cv = (d, ic, lab) => `<button class="cv" data-act="step" data-d="${d}" ${!on || t == null || (d < 0 ? t <= mn : t >= mx) ? 'disabled' : ''} aria-label="${lab}" title="${lab}">${H.icon(ic)}</button>`;
    const tr = `<div class="tr">${cv(-1, 'mdi:chevron-left', hgTr('Obniż temperaturę', 'Lower temperature'))}${num}${cv(1, 'mdi:chevron-right', hgTr('Podwyższ temperaturę', 'Raise temperature'))}</div>`;
    const bar = `<div class="bar" role="slider" tabindex="${on && t != null ? 0 : -1}" aria-label="${hgTr('Temperatura docelowa', 'Target temperature')}" aria-valuemin="${mn}" aria-valuemax="${mx}" aria-valuenow="${t ?? ''}" aria-valuetext="${t != null ? H.fmt(t) + '°' : ''}" ${on && t != null ? '' : 'aria-disabled="true"'}><i class="tk"></i>${cur != null ? '<i class="cu"></i>' : ''}<i class="kn"></i></div>`;
    const pw = `<button class="mb pw ${on ? 'on' : 'off'}" data-act="toggle" aria-pressed="${on}" aria-label="${on ? hgTr('Wyłącz klimatyzację', 'Turn off air conditioning') : hgTr('Włącz klimatyzację', 'Turn on air conditioning')}" title="${on ? hgTr('Wyłącz', 'Turn off') : hgTr('Włącz', 'Turn on')}"><i>${H.icon('mdi:power')}</i><span class="fl">${on ? hgTr('Włączona', 'On') : hgTr('Wyłączona', 'Off')}</span><span class="sh">${on ? hgTr('Wł.', 'On') : hgTr('Wył.', 'Off')}</span></button>`;
    const mb = (x) => { const mm = HG_AC_MODE[x.mode] || HG_AC_MODE.cool, act = st === x.mode; return `<button class="mb ${act ? 'act' : ''}" data-act="mode" data-m="${x.mode}" aria-pressed="${act}" aria-label="${H.esc(x.label)}" title="${H.esc(x.label)}" style="--mc:${mm.c};--mo:${mm.on}"><i>${H.icon(mm.i)}</i><span class="fl">${H.esc(x.label)}</span><span class="sh">${H.esc(x.short || x.label)}</span></button>`; };
    const fm = a.fan_mode, fms = a.fan_modes || [], sw = a.swing_mode, sws = a.swing_modes || [];
    const en = hgCurLang() === 'en', fv = H.esc((en ? HG_FAN_EN : HG_FAN_PL)[fm] || fm), sv = H.esc((en ? HG_SWING_EN : HG_SWING_PL)[sw] || sw);
    const fan = fm && fms.length > 1 ? `<button class="mb" data-act="fan" aria-label="${hgTr(`Nawiew: ${fv} (zmień)`, `Fan: ${fv} (change)`)}" title="${hgTr(`Nawiew: ${fv} – zmień prędkość`, `Fan: ${fv} – change speed`)}"><i class="v">${H.icon('mdi:fan')}<em>${fv}</em></i><span class="fl">${hgTr('Nawiew', 'Fan')}</span><span class="sh">${hgTr('Nawiew', 'Fan')}</span></button>` : '';
    const swb = sw && sws.length > 1 ? `<button class="mb" data-act="swing" aria-label="${hgTr(`Kierunek nawiewu: ${sv} (zmień)`, `Swing: ${sv} (change)`)}" title="${hgTr(`Kierunek nawiewu: ${sv} – zmień`, `Swing: ${sv} – change`)}"><i class="v">${H.icon('mdi:arrow-oscillating')}<em>${sv}</em></i><span class="fl">${hgTr('Kierunek', 'Swing')}</span><span class="sh">${hgTr('Kier.', 'Swing')}</span></button>` : '';
    const cls = `glass ${on ? 'on' : 'off'} ${c.compact ? 'compact' : ''}`;
    /* zwijane tryby: zwinięte = zasilanie + aktywny tryb + „Tryby”; rozwinięte = pełna siatka (+ Nawiew/Kierunek) */
    const open = this._isOpen();
    const am = on ? st : (this._last && hv.includes(this._last) ? this._last : null), amx = am && (modes.find((y) => y.mode === am) || { mode: am, label: (HG_AC_MODE[am] || {}).l || am });
    const actB = amx ? mb(amx).replace('class="mb ', 'class="mb cur ') : '';
    const xb = `<button class="mb xb" data-act="xp" aria-expanded="${open}" aria-label="${open ? hgTr('Zwiń tryby', 'Collapse modes') : hgTr('Wszystkie tryby', 'All modes')}" title="${open ? hgTr('Zwiń tryby', 'Collapse modes') : hgTr('Wszystkie tryby', 'All modes')}"><i>${H.icon('mdi:chevron-down')}</i><span class="fl">${hgTr('Tryby', 'Modes')}</span><span class="sh">${hgTr('Tryby', 'Modes')}</span></button>`;
    const xp = (inner) => `<div class="xp ${open ? 'open' : ''}"><div class="xi" ${open ? '' : 'inert'}>${inner}</div></div>`;
    if (c.compact) {
      const sub = [this._stat(st, t), cur != null ? hgTr(`wnętrze ${H.fmt(cur)}°`, `indoor ${H.fmt(cur)}°`) : ''].filter(Boolean).join(' · ');
      return `<ha-card class="${cls}" style="${sty}"><div class="c1"><div class="nm"><b>${H.esc(c.title)}</b><span>${H.esc(sub)}</span></div>${tr}</div>
        ${bar}<div class="mw"><div class="c2"><div class="mm">${pw}${actB}${xb}</div>${kb}</div>${xp(`<div class="mm mx">${modes.map(mb).join('')}${fan}${swb}</div>`)}</div></ha-card>`;
    }
    const room = this._room();
    return `<ha-card class="${cls}" style="${sty}"><div class="hd"><span class="tt">${H.esc(c.title)}${room ? ` <span>· ${H.esc(room)}</span>` : ''}</span><span class="sp"></span>${kb}</div>
      <div class="temp">${cur != null ? `<div class="lab">${H.esc(c.room_label)} ${H.fmt(cur)}°</div>` : ''}${tr}<div class="st" role="status">${H.esc(this._stat(st, t))}</div></div>
      <div class="bw"><small>${H.fmt(mn)}°</small>${bar}<small>${H.fmt(mx)}°</small></div>
      <div class="mw"><div class="mr top">${pw}${actB}${fan ? fan.replace('class="mb"', 'class="mb fanc"') : ''}${xb}</div>${xp(`<div class="mr">${modes.map(mb).join('')}${fan}${swb}</div>`)}</div></ha-card>`;
  }
  /* zmiana nastawy w miejscu (bez przerysowania pod palcem), zatwierdzenie z opóźnieniem */
  _setT(v, commitMs) {
    const s = H.st(this._hass, this._config.entity); if (!s) return;
    const { step, mn, mx } = this._lim(s); v = Math.max(mn, Math.min(mx, Math.round((v - mn) / step) * step + mn)); v = +v.toFixed(1);
    const prev = this._opt && this._opt.t != null ? this._opt.t : this._eff(s).t;
    if (prev !== v) H.haptic('selection');
    this._opt = { ...(this._opt || {}), t: v, ts: Date.now() };
    const R = this.$, card = R.querySelector('ha-card'), fr = (v - mn) / (mx - mn);
    if (card) { card.style.setProperty('--pp', (fr * 100).toFixed(2) + '%'); const n = R.querySelector('.num'); if (n) n.firstChild.nodeValue = H.fmt(v);
      const st = R.querySelector('.st, .c1 .nm span'); if (st) { const cur = s.attributes.current_temperature; st.textContent = this._config.compact ? [this._stat(this._eff(s).st, v), cur != null ? hgTr(`wnętrze ${H.fmt(cur)}°`, `indoor ${H.fmt(cur)}°`) : ''].filter(Boolean).join(' · ') : this._stat(this._eff(s).st, v); }
      const b = R.querySelector('.bar'); if (b) { b.setAttribute('aria-valuenow', v); b.setAttribute('aria-valuetext', H.fmt(v) + '°'); }
      R.querySelectorAll('.cv').forEach((x) => { const d = +x.dataset.d; x.toggleAttribute('disabled', d < 0 ? v <= mn : v >= mx); }); }
    clearTimeout(this._ct); this._ct = setTimeout(() => this._commit(), commitMs);
  }
  _commit() {
    const s = H.st(this._hass, this._config.entity); if (!s || !this._opt || this._opt.t == null) return;
    if (Number(s.attributes.temperature) !== this._opt.t) H.call(this._hass, 'climate', 'set_temperature', { entity_id: this._config.entity, temperature: this._opt.t });
    this._opt.ts = Date.now();
  }
  afterRender() {
    if (!this._wired) {
      this._wired = true;
      const R = this.shadowRoot;
      const valAt = (bar, x) => { const s = H.st(this._hass, this._config.entity), { mn, mx } = this._lim(s), r = bar.getBoundingClientRect(); return mn + Math.max(0, Math.min(1, (x - r.left) / r.width)) * (mx - mn); };
      /* dotyk: pasek przeciąga się w bok (pion przewija stronę), dotknięcie paska skacze do miejsca; przytrzymanie temperatury = szczegóły encji */
      const end = (e) => { const g = this._g; this._g = null;
        if (g && !this._drag && e && e.type === 'pointerup' && Math.abs(e.clientX - g.x) < 8 && Math.abs(e.clientY - g.y) < 8) this._setT(valAt(g.bar, e.clientX), 700);
        if (this._drag) { this._drag.classList.remove('drag'); this._drag = null; clearTimeout(this._ct); this._ct = setTimeout(() => this._commit(), 250); }
        if (g) setTimeout(() => { this._touching = false; this._update(true); }, 300);
        clearTimeout(this._lp); this._lpXY = null;
        if (this._cvEl) { this._cvEl.classList.remove('prs'); this._cvEl = null; } clearTimeout(this._rd); clearInterval(this._rp);
        window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); };
      this._acEnd = end;
      const drag = (bar, e) => { this._touching = true; try { bar.setPointerCapture && bar.setPointerCapture(e.pointerId); } catch (x) { /* */ } bar.classList.add('drag'); this._drag = bar; this._setT(valAt(bar, e.clientX), 60000); };
      R.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        const p = e.composedPath(), has = (c) => p.find((n) => n.classList && n.classList.contains(c)), bar = has('bar'), cv = has('cv'), num = has('num');
        const card = R.querySelector('ha-card'); if (!card) return;
        if (bar || cv || num) { window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end); }
        if (num) { this._lpXY = [e.clientX, e.clientY]; this._lpFired = false; clearTimeout(this._lp); this._lp = setTimeout(() => { this._lpFired = true; H.haptic('medium'); H.fire(this, 'hass-more-info', { entityId: this._config.entity }); }, 520); return; }
        if (card.classList.contains('off')) return;
        if (bar && this._eff(H.st(this._hass, this._config.entity)).t == null) return;   // zakres low/high: pasek nieaktywny
        if (bar) { this._g = { bar, x: e.clientX, y: e.clientY }; if (e.pointerType === 'mouse') { e.preventDefault(); drag(bar, e); } return; }
        if (cv && !cv.hasAttribute('disabled')) { this._ptrStep = true; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); cv.classList.add('prs'); const d = +cv.dataset.d, go = () => { const s = H.st(this._hass, this._config.entity); const t = this._eff(s).t; if (t == null) return; this._setT(t + d * this._lim(s).step, 700); };
          go(); clearInterval(this._rp); clearTimeout(this._rd); this._rd = setTimeout(() => { this._rp = setInterval(go, 160); }, 420); this._cvEl = cv; }
      });
      R.addEventListener('pointermove', (e) => {
        if (this._lpXY && Math.hypot(e.clientX - this._lpXY[0], e.clientY - this._lpXY[1]) > 8) { clearTimeout(this._lp); this._lpXY = null; }
        const g = this._g; if (g && !this._drag) { const dx = Math.abs(e.clientX - g.x), dy = Math.abs(e.clientY - g.y); if (dx > 6 && dx > dy) drag(g.bar, e); }
        if (this._drag) this._setT(valAt(this._drag, e.clientX), 60000);
      });
      R.addEventListener('pointerup', end); R.addEventListener('pointercancel', end);
      R.addEventListener('contextmenu', (e) => { if (e.composedPath().find((n) => n.classList && n.classList.contains('num'))) e.preventDefault(); });
      R.addEventListener('keydown', (e) => { const b = e.composedPath()[0]; if (!b.classList || !b.classList.contains('bar')) return; const s = H.st(this._hass, this._config.entity), { step } = this._lim(s), t = this._eff(s).t; if (t == null) return;
        const k = e.key, d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -4, PageUp: 4 }[k], { mn, mx } = this._lim(s);
        if (d) { e.preventDefault(); this._setT(t + d * step, 700); } else if (k === 'Home' || k === 'End') { e.preventDefault(); this._setT(k === 'Home' ? mn : mx, 700); } });
    }
    if (!this._config.compact) { if (!this._ro && window.ResizeObserver) { this._ro = new ResizeObserver(() => this._fit()); this._ro.observe(this); } this._fit(); }
  }
  /* rozmiar: cyfry ≈ szerokość × 0,28 (56–96 px), przyciski 56/64; na desktopie bez przewijania zmniejsza, aż treść się zmieści */
  _fit() {
    const card = this.$.querySelector('ha-card'); if (!card || !card.querySelector('.temp')) return;
    const pg = this.getRootNode() && this.getRootNode().host, fixedH = !!(pg && pg.getAttribute && pg.getAttribute('mode') === 'wide' && !pg.hasAttribute('scroll'));
    const cs = getComputedStyle(card), W = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); if (W <= 0) return;
    let ts = Math.round(Math.max(56, Math.min(80, W * 0.27))), bs = W >= 420 ? 64 : 56, cvs = W >= 340 ? 64 : 56, tight = false, nolab = false;
    const apply = () => { this.style.setProperty('--ts', ts + 'px'); this.style.setProperty('--bs', bs + 'px'); this.style.setProperty('--cv', cvs + 'px'); card.classList.toggle('tight', tight); card.classList.toggle('nolab', nolab); };
    card.classList.remove('ov', 'ovt'); apply();
    /* wysokość docelowa (niezależna od trwającej animacji rozwijania) */
    const xp = card.querySelector('.xp'), xi = xp && xp.firstElementChild;
    const over = () => card.scrollHeight - card.clientHeight - (xp ? xp.getBoundingClientRect().height : 0) + (xp && xp.classList.contains('open') && xi.firstElementChild ? xi.firstElementChild.offsetHeight : 0);
    const isOpen = !!(xp && xp.classList.contains('open'));
    if (fixedH) {
      const shrink = (f) => { let n = 0; while (f() > 1 && n++ < 16) { if (ts > 56) ts = Math.max(56, ts - 6); else if (!tight) tight = true; else if (!nolab) nolab = true; else if (bs > 48) bs -= 4; else if (cvs > 48) cvs -= 4; else return false; apply(); } return f() <= 1; };
      const closed = () => card.scrollHeight - card.clientHeight - (xp ? xp.getBoundingClientRect().height : 0);
      shrink(closed);
      if (isOpen) {
        const S = [ts, tight, nolab, bs, cvs];
        /* rozwinięcie w układzie tylko kosztem cyfr; inaczej warstwa nad temperaturą (wymiary jak po zwinięciu) */
        let n = 0; while (over() > 1 && n++ < 6 && ts > 56) { ts = Math.max(56, ts - 6); apply(); }
        if (over() > 1) {
          [ts, tight, nolab, bs, cvs] = S; apply(); card.classList.add('ov');
          const top = card.querySelector('.mr.top'), hd = card.querySelector('.hd'), cr = card.getBoundingClientRect();
          card.style.setProperty('--xt', Math.round(hd.getBoundingClientRect().bottom - cr.top + 4) + 'px');
          card.style.setProperty('--xbm', Math.round(cr.bottom - top.getBoundingClientRect().top + 8) + 'px');
          if (xi.firstElementChild.offsetHeight > xp.clientHeight - 16) card.classList.add('ovt');
        }
      }
    }
  }
  disconnectedCallback() { if (this._acEnd) this._acEnd(); clearTimeout(this._lp); clearTimeout(this._rd); clearInterval(this._rp); if (this._ct) { clearTimeout(this._ct); this._ct = 0; this._commit(); } }
  _set(o) { this._opt = { ...o, ts: Date.now() }; this.rerender(); }
  _okey() { return 'home-glass:ac-open:' + this._config.entity + (this._config.compact ? ':c' : ''); }
  _isOpen() { if (this._open == null) { try { this._open = sessionStorage.getItem(this._okey()) === '1'; } catch (e) { this._open = false; } } return this._open; }
  _setOpen(v) {
    this._open = !!v; try { sessionStorage.setItem(this._okey(), v ? '1' : '0'); } catch (e) { /* prywatny tryb */ }
    const R = this.$, xp = R.querySelector('.xp'), xb = R.querySelector('.xb');
    if (xp) { xp.classList.toggle('open', this._open); xp.firstElementChild.toggleAttribute('inert', !this._open); }
    if (xb) { xb.setAttribute('aria-expanded', this._open); const l = this._open ? hgTr('Zwiń tryby', 'Collapse modes') : hgTr('Wszystkie tryby', 'All modes'); xb.setAttribute('aria-label', l); xb.title = l; }
    this._html = null;                 // następne przerysowanie zbuduje DOM z nowym stanem
    if (!this._config.compact) this._fit();
  }
  onAct(a, el, ev) {
    const c = this._config, s = H.st(this._hass, c.entity); if (!s) return;
    const id = { entity_id: c.entity };
    if (a === 'more') return H.fire(this, 'hass-more-info', { entityId: c.entity });
    if (a === 'ctr') { if (this._lpFired) { this._lpFired = false; return; } if (this._eff(s).st === 'off') return this.onAct('toggle', el, ev); return; }
    if (a === 'step') { if (this._ptrStep) { this._ptrStep = false; return; } const t = this._eff(s).t; if (t != null) this._setT(t + (+el.dataset.d) * this._lim(s).step, 700); return; }
    if (a === 'toggle' || a === 'fan' || a === 'swing' || a === 'mode') H.haptic('light');
    if (a === 'toggle') {
      const sf = s.attributes.supported_features || 0, cur = this._eff(s).st;
      if (cur === 'off') {
        const back = c.default_mode || this._last || (s.attributes.hvac_modes || []).find((x) => x !== 'off') || 'cool';
        this._set({ state: back, any: true });
        return sf & 256 ? H.call(this._hass, 'climate', 'turn_on', id) : H.call(this._hass, 'climate', 'set_hvac_mode', { ...id, hvac_mode: back });
      }
      this._set({ state: 'off' });
      return sf & 128 ? H.call(this._hass, 'climate', 'turn_off', id) : H.call(this._hass, 'climate', 'set_hvac_mode', { ...id, hvac_mode: 'off' });
    }
    if (a === 'fan') { const L = s.attributes.fan_modes || [], i = L.indexOf(s.attributes.fan_mode); return H.call(this._hass, 'climate', 'set_fan_mode', { ...id, fan_mode: L[(i + 1) % L.length] }); }
    if (a === 'swing') { const L = s.attributes.swing_modes || [], i = L.indexOf(s.attributes.swing_mode); return H.call(this._hass, 'climate', 'set_swing_mode', { ...id, swing_mode: L[(i + 1) % L.length] }); }
    if (a === 'xp') return this._setOpen(!this._isOpen());
    if (a === 'mode') { if (this._isOpen() && !el.classList.contains('cur')) { this._open = false; try { sessionStorage.setItem(this._okey(), '0'); } catch (e) { /* */ } } this._set({ state: el.dataset.m }); return H.call(this._hass, 'climate', 'set_hvac_mode', { ...id, hvac_mode: el.dataset.m }); }
  }
  getGridOptions() { return { columns: 6, rows: 5 }; }
}
hgReg('hg-ac-card', HGACCard, hgTr('Home Glass – Klimatyzacja', 'Home Glass – Climate'), hgTr('Klimatyzacja w stylu Tesli: temperatura, pasek, tryby', 'Tesla-style climate control: temperature, bar, modes'));

/* ===================== OŚWIETLENIE ===================== */
class HGLightCard extends HGBase {
  defaults() { return { title: hgTr('Oświetlenie', 'Lighting'), icon: 'mdi:lightbulb-outline', name: null }; }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; justify-content:space-between; padding:var(--s2) var(--s3) var(--s3); }
.hd .tt{ font-weight:400; }
.hd .ic.on{ color:var(--hg-accent-tx); }
.trk{ position:relative; height:max(calc(var(--k) * 28), var(--hg-tgt, 0px)); border-radius:var(--r-md); background: rgba(255,255,255,.6);
  box-shadow: inset 0 1px 2px rgba(0,0,0,.06); touch-action:none; cursor:pointer; overflow:hidden; }
.fl{ position:absolute; left:0; top:0; bottom:0; border-radius:var(--r-md); min-width:28u; background:var(--hg-accent-faint); transition: width .25s ease; }
.drag .fl{ transition:none; }
.fl .sun{ position:absolute; left:9u; top:50%; transform:translateY(-50%); width:10u; height:10u; color:#fff; }
.fl i{ position:absolute; right:10u; top:32%; bottom:32%; width:2u; border-radius:2u; background:rgba(255,255,255,.95); }
.pc{ position:absolute; right:12u; top:50%; transform:translateY(-50%); font-size:var(--fs-sm); color:#2B2E33; pointer-events:none; }
.off .fl{ background:#E2DCEB; }
.un .trk{ cursor:not-allowed; } .un .pc{ color:#9A9EA4; } .un .fl i{ display:none; }
`);
  }
  pct() {
    if (this._drag != null) return this._drag;
    if (this._pending != null) return this._pending;
    const s = H.st(this._hass, this._config.entity);
    if (!s || s.state !== 'on') return 0;
    const b = s.attributes.brightness; return b == null ? 100 : Math.round((b / 255) * 100);
  }
  _extraSig() { return [this._drag, this._pending]; }
  render() {
    const c = this._config, s = H.st(this._hass, c.entity);
    const on = s && s.state === 'on', un = !s || s.state === 'unavailable', p = this.pct();
    const nm = c.name || (s && s.attributes.friendly_name) || c.entity;
    const hd = `<div class="hd"><button class="ib" data-act="toggle" aria-label="${hgTr('Przełącz', 'Toggle')} ${H.esc(nm)}" title="${H.esc(nm)}" style="margin-left:calc(var(--k) * -4)">${H.icon(c.icon, 'ic' + (on ? ' on' : ''))}</button>
      <span class="tt">${H.esc(c.title)}</span><span class="sp"></span>
      <button class="ib" data-act="more" aria-label="${hgTr('Rozwiń', 'Expand')}" title="${H.esc(nm)}">${H.icon('mdi:arrow-expand')}</button></div>`;
    return `<ha-card class="glass ${p ? '' : 'off'} ${un ? 'un' : ''}" title="${H.esc(nm)}${un ? hgTr(' – niedostępne', ' – unavailable') : ''}">${hd}
      <div class="trk" role="slider" aria-label="${hgTr('Jasność', 'Brightness')} ${H.esc(nm)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}" tabindex="${un ? -1 : 0}" ${un ? 'aria-disabled="true"' : ''}>
        <div class="fl" style="width:${p}%">${H.icon('mdi:white-balance-sunny', 'sun')}<i></i></div><span class="pc">${un ? '—' : p + '%'}</span></div></ha-card>`;
  }
  afterRender() {
    const t = this.$.querySelector('.trk'); if (!t || t.getAttribute('aria-disabled')) return;
    const calc = (ev) => { const r = t.getBoundingClientRect(); return Math.round(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * 100); };
    const send = (v) => {
      const id = { entity_id: this._config.entity }; this._pending = v;
      clearTimeout(this._pt); this._pt = setTimeout(() => { this._pending = null; this.rerender(); }, 4000);
      if (v <= 0) H.call(this._hass, 'light', 'turn_off', id); else H.call(this._hass, 'light', 'turn_on', { ...id, brightness_pct: v });
      this.rerender();
    };
    t.addEventListener('pointerdown', (ev) => { t.setPointerCapture(ev.pointerId); this._drag = calc(ev); t.classList.add('drag'); this._paint(t); this._busy = true; });
    t.addEventListener('pointermove', (ev) => { if (this._drag == null) return; this._drag = calc(ev); this._paint(t); });
    const end = () => { if (this._drag == null) return; const v = this._drag; this._drag = null; this._busy = false; send(v); };
    t.addEventListener('pointerup', end); t.addEventListener('pointercancel', end);
    t.addEventListener('keydown', (ev) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(ev.key)) return;
      ev.preventDefault(); send(Math.max(0, Math.min(100, this.pct() + (ev.key === 'ArrowRight' ? 10 : -10))));
    });
  }
  _paint(t) { const p = this._drag; t.querySelector('.fl').style.width = p + '%'; t.querySelector('.pc').textContent = p + '%'; t.setAttribute('aria-valuenow', p); }
  set hass(h) {
    const old = this._hass; this._hass = h;
    if (this._pending != null && old && this._config) { const s = H.st(h, this._config.entity), o = H.st(old, this._config.entity); if (s && o && s.last_updated !== o.last_updated) this._pending = null; }
    this._update();
  }
  get hass() { return this._hass; }
  onAct(a) {
    const e = this._config.entity;
    if (a === 'more') return H.fire(this, 'hass-more-info', { entityId: e });
    if (a === 'toggle') { const s = H.st(this._hass, e); if (!s || s.state === 'unavailable') return; return H.call(this._hass, 'light', 'toggle', { entity_id: e }); }
  }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-light-card', HGLightCard, hgTr('Home Glass – Oświetlenie', 'Home Glass – Light'), hgTr('Suwak jasności światła', 'Light brightness slider'));

/* ===================== PRZEŁĄCZNIK (Wi-Fi / Kuchnia / pokoje) ===================== */
class HGSwitchCard extends HGBase {
  defaults() { return { title: null, subtitle: null, icon: 'mdi:toggle-switch-outline', layout: 'row', more: true, info_entity: null }; }
  list() { const c = this._config; return c.entities || [c.entity]; }
  ents() { return this.list().concat(this._config.info_entity ? [this._config.info_entity] : []); }
  css() {
    return U(`
ha-card.glass{ display:flex; align-items:center; gap:var(--s1); padding:0 var(--s1) 0 var(--s3); }
.ic{ width:12u; height:12u; flex:none; color:#2A2D31; }
.tt{ font-size:var(--fs-md); font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
.tt small{ font-size:var(--fs-xs); color:#5A5E64; margin-left:5u; }
.sp{ flex:1; }
ha-card.tile{ flex-direction:column; align-items:stretch; justify-content:space-between; padding:var(--s2) var(--s1) var(--s2) var(--s3); gap:0; }
.tile .row{ display:flex; align-items:center; gap:var(--s1); }
.tile .ic{ width:15u; height:15u; }
.tile.on .ic{ color:var(--hg-accent-tx); }
.tile .nm{ font-size:var(--fs-md); font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tile .stt{ font-size:var(--fs-xs); color:#7A7E84; margin-top:2u; }
`);
  }
  render() {
    const c = this._config, ids = this.list();
    const ss = ids.map((e) => H.st(this._hass, e));
    const avail = ss.some((s) => s && s.state !== 'unavailable');
    const onN = ss.filter((s) => s && s.state === 'on').length, on = onN > 0;
    const title = c.title || H.name(this._hass, ids[0]);
    let tip = `${title}: ${avail ? H.stateLabel(on ? 'on' : 'off') : hgTr('niedostępne', 'unavailable')}`;
    if (c.info_entity) { const s = H.st(this._hass, c.info_entity); tip += ` · Internet: ${s && s.state === 'on' ? hgTr('połączony', 'connected') : hgTr('brak', 'disconnected')}`; }
    const tg = this.toggleHtml(on, 'toggle', !avail, title);
    const kb = c.more ? `<button class="ib kebab" data-act="more" aria-label="${hgTr('Więcej', 'More')}" title="${hgTr('Więcej', 'More')}">${H.icon('mdi:dots-vertical')}</button>` : '';
    if (c.layout === 'tile') {
      const st = !avail ? hgTr('niedostępne', 'unavailable') : on ? (ids.length > 1 ? `${hgTr('Włączone', 'On')} · ${onN}/${ids.length}` : hgTr('Włączone', 'On')) : hgTr('Wyłączone', 'Off');
      return `<ha-card class="glass tile ${on ? 'on' : ''}" title="${H.esc(tip)}"><div class="row">${H.icon(c.icon, 'ic')}<span class="sp"></span>${tg}${kb}</div>
        <div><div class="nm">${H.esc(title)}</div><div class="stt">${H.esc(st)}</div></div></ha-card>`;
    }
    return `<ha-card class="glass ${on ? 'on' : ''}" title="${H.esc(tip)}">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(title)}${c.subtitle ? `<small>(${H.esc(c.subtitle)})</small>` : ''}</span><span class="sp"></span>${tg}${kb}</ha-card>`;
  }
  onAct(a) {
    const ids = this.list();
    if (a === 'more') return H.fire(this, 'hass-more-info', { entityId: this._config.more_entity || ids[0] });
    if (a === 'toggle') {
      const on = ids.some((e) => { const s = H.st(this._hass, e); return s && s.state === 'on'; });
      return H.call(this._hass, 'homeassistant', on ? 'turn_off' : 'turn_on', { entity_id: ids.filter((e) => { const s = H.st(this._hass, e); return s && s.state !== 'unavailable'; }) });
    }
  }
  getGridOptions() { return { columns: 6, rows: 1 }; }
}
hgReg('hg-switch-card', HGSwitchCard, hgTr('Home Glass – Przełącznik', 'Home Glass – Switch'), hgTr('Przełącznik w stylu glass (wiersz lub kafel)', 'Glass-style switch (row or tile)'));
