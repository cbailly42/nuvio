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
  /* c: kolor trybu (łuk, gałka, aktywny przycisk), g: poświata, x: ikona na aktywnym przycisku, t: token tekstu statusu (kontrast w obu schematach) */
  cool: { c: 'var(--hg-ac-cool)', g: 'var(--hg-ac-cool-g)', x: 'var(--hg-ac-cool-tx)', i: 'mdi:snowflake', t: 'cool', get l() { return hgTr('Chłodzenie', 'Cooling'); } },
  heat: { c: 'var(--hg-ac-heat)', g: 'var(--hg-ac-heat-g)', x: 'var(--hg-ac-heat-tx)', i: 'mdi:fire', t: 'heat', get l() { return hgTr('Grzanie', 'Heating'); } },
  dry: { c: 'var(--hg-ac-dry)', g: 'var(--hg-ac-dry-g)', x: 'var(--hg-ac-dry-tx)', i: 'mdi:water-percent', t: 'dry', get l() { return hgTr('Osuszanie', 'Drying'); } },
  fan_only: { c: 'var(--hg-ac-fan)', g: 'var(--hg-ac-fan-g)', x: 'var(--hg-ac-neu-tx)', i: 'mdi:fan', t: 'neu', get l() { return hgTr('Wentylacja', 'Fan only'); } },
  heat_cool: { c: 'var(--hg-accent)', g: 'var(--hg-accent-glow)', x: 'var(--hg-accent-tx)', i: 'mdi:thermostat-auto', t: 'auto', l: 'Auto' }, auto: { c: 'var(--hg-accent)', g: 'var(--hg-accent-glow)', x: 'var(--hg-accent-tx)', i: 'mdi:thermostat-auto', t: 'auto', l: 'Auto' },
  off: { c: '#A3A9B1', g: 'transparent', x: 'var(--hg-ac-neu-tx)', i: 'mdi:power', t: 'neu', get l() { return hgTr('Wyłączona', 'Off'); } },
};
const HG_FAN_PL = { auto: 'Auto', low: 'Niski', medium: 'Średni', middle: 'Średni', mid: 'Średni', high: 'Wysoki', quiet: 'Cichy', silent: 'Cichy', turbo: 'Turbo', strong: 'Mocny', diffuse: 'Rozproszony', focus: 'Skupiony', on: 'Wł.', off: 'Wył.' };
const HG_SWING_PL = { off: 'Stały', on: 'Ruch', horizontal: 'Poziomo', vertical: 'Pionowo', both: 'Oba', swing: 'Ruch' };
const HG_FAN_EN = { auto: 'Auto', low: 'Low', medium: 'Medium', middle: 'Medium', mid: 'Medium', high: 'High', quiet: 'Quiet', silent: 'Silent', turbo: 'Turbo', strong: 'Strong', diffuse: 'Diffuse', focus: 'Focus', on: 'On', off: 'Off' };
const HG_SWING_EN = { off: 'Fixed', on: 'Swing', horizontal: 'Horizontal', vertical: 'Vertical', both: 'Both', swing: 'Swing' };
/* Klimatyzacja: szklane pokrętło (łuk 270°) z gradientem temperatury, gałką do przeciągania i poświatą trybu; rząd przycisków trybów.
   Dotyk: przeciąganie po łuku (strona się nie przewija tylko wtedy, gdy palec trafi w łuk), przytrzymanie środka = szczegóły encji,
   dotknięcie środka przy wyłączonej = włącz, przytrzymanie −/+ = powtarzanie, wibracja przy każdym kroku. Kompakt (pokoje): szklany suwak. */
const HG_AC_G = { a0: 135, sw: 270, cx: 120, cy: 120, r: 100 };
const hgAcPt = (f, r = HG_AC_G.r) => { const a = (HG_AC_G.a0 + HG_AC_G.sw * f) * Math.PI / 180; return [HG_AC_G.cx + r * Math.cos(a), HG_AC_G.cy + r * Math.sin(a)]; };
const HG_AC_ARC = (() => { const [x0, y0] = hgAcPt(0), [x1, y1] = hgAcPt(1); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${HG_AC_G.r} ${HG_AC_G.r} 0 1 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; })();
let hgAcUid = 0;
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
/* ----- pokrętło ----- */
.dw{ position:relative; height:calc(var(--dz, 220px) * .9); }
.fx .dw{ flex:1 1 0; height:auto; min-height:0; }
.dial{ position:absolute; left:50%; top:50%; width:var(--dz, 220px); height:calc(var(--dz, 220px) * .9); transform:translate(-50%, -50%); }
.ring{ position:absolute; inset:0; width:100%; height:100%; overflow:visible; outline:none; cursor:pointer; touch-action:pan-y; -webkit-tap-highlight-color:transparent; }
.ring path, .ring circle{ fill:none; }
.ring .trk{ stroke:var(--hg-tile-bg); stroke-width:16; stroke-linecap:round; }
.ring .grd{ stroke-width:16; stroke-linecap:round; opacity:.26; transition:opacity .3s; }
.ring .val{ stroke-width:16; stroke-linecap:round; transition:stroke-dasharray .35s cubic-bezier(.2,0,0,1), stroke-dashoffset .35s cubic-bezier(.2,0,0,1), opacity .3s; filter:drop-shadow(0 0 6px var(--mg)); }
.ring .tks{ stroke:var(--hg-ink, #000); stroke-opacity:.22; stroke-width:1.4; stroke-linecap:round; }
.ring .cur{ fill:var(--hg-ink, #000); fill-opacity:.55; stroke:var(--hg-thumb); stroke-width:1.5; stroke-opacity:.9; }
.ring .kn{ transition:transform .35s cubic-bezier(.2,0,0,1); }
.ring .kn circle{ fill:var(--hg-thumb); stroke:var(--mc); stroke-width:4; filter:drop-shadow(0 2px 5px rgba(0,0,0,.28)); transform-box:fill-box; transform-origin:center; transition:transform .18s cubic-bezier(.2,0,0,1), stroke .3s; }
.drag .ring .kn, .drag .ring .val{ transition:none; }
.drag .ring .kn circle{ transform:scale(1.22); }
.ring:focus-visible .kn circle{ stroke:var(--hg-ink, #000); }
.hit{ position:absolute; left:-2.5%; top:-2.78%; width:105%; height:116.67%; border-radius:50%; clip-path:circle(50%); touch-action:none; cursor:pointer; -webkit-tap-highlight-color:transparent; }
.off .hit, .rng0 .hit{ touch-action:pan-y; }
.glow{ position:absolute; left:50%; top:55.6%; width:62%; aspect-ratio:1; transform:translate(-50%, -50%); border-radius:50%; pointer-events:none;
  background:radial-gradient(closest-side, var(--mg) 0%, transparent 100%); opacity:.5; transition:opacity .4s, background .4s; }
.acting .glow{ animation:hgAcBreath 3.2s ease-in-out infinite; }
@keyframes hgAcBreath{ 0%,100%{ opacity:.38; transform:translate(-50%, -50%) scale(.94); } 50%{ opacity:.7; transform:translate(-50%, -50%) scale(1.04); } }
.ctr{ position:absolute; left:50%; top:55.6%; transform:translate(-50%, -50%); width:58%; aspect-ratio:1; border-radius:50%; padding-bottom:7%; touch-action:pan-y; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:calc(var(--dz, 220px) * .012); text-align:center; cursor:pointer; -webkit-tap-highlight-color:transparent; }
.ctr .md{ display:inline-flex; align-items:center; gap:4px; max-width:100%; font-size:max(11px, calc(var(--dz, 220px) * .052)); font-weight:600; color:var(--mt); white-space:nowrap; transition:color .2s; }
.ctr .md ha-icon{ width:1.2em; height:1.2em; --mdc-icon-size:1.2em; flex:none; } .ctr .md span{ overflow:hidden; text-overflow:ellipsis; }
.acting .ctr .md ha-icon{ animation:hgpulse 2s ease-in-out infinite; }
.num{ position:relative; font-size:calc(var(--dz, 220px) * .245); font-weight:200; letter-spacing:-.045em; line-height:.95; color:#16181B; font-variant-numeric:tabular-nums; white-space:nowrap; padding:0 .24em; transition:color .2s, transform .15s; }
.num small{ font-size:.42em; font-weight:300; letter-spacing:-.02em; }
.num sup{ position:absolute; top:.06em; right:.02em; font-size:.34em; font-weight:300; letter-spacing:0; }
.num.rng{ font-size:calc(var(--dz, 220px) * .13); letter-spacing:-.02em; padding-right:.45em; }
.drag .num{ transform:scale(1.04); }
.ctr .lab{ font-size:max(10px, calc(var(--dz, 220px) * .046)); letter-spacing:.1em; text-transform:uppercase; color:#5A5E64; white-space:nowrap; font-variant-numeric:tabular-nums; }
.dial{ --cvs:max(var(--cvmin, 34px), calc(var(--dz, 220px) * .16)); }
@media (pointer:coarse){ .dial{ --cvmin:42px; } }
.cv{ position:absolute; top:93%; width:var(--cvs); height:var(--cvs); margin:calc(var(--cvs) / -2) 0 0 calc(var(--cvs) / -2);
  border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--hg-inner-bg, var(--hg-tile-bg)); box-shadow:var(--hg-inner-hi, none); color:#2A2D31; transition:background .15s, transform .12s; touch-action:manipulation; }
.cv.mn{ left:37%; } .cv.pl{ left:63%; }
.cv ha-icon{ width:55%; height:55%; --mdc-icon-size:100%; } .cv:active, .cv.prs{ transform:scale(.9); background:var(--hg-inner-bg-h, var(--hg-tile-bg)); } .cv[disabled]{ opacity:.3; }
@media (hover:hover) and (pointer:fine){ .cv:not([disabled]):hover{ background:var(--hg-inner-bg-h, var(--hg-tile-bg)); } }
/* wyłączona: łuk szary, bez poświaty */
.off .ring .val, .off .ring .grd{ filter:grayscale(1); opacity:.32; } .off .ring .kn circle{ stroke:#A3A9B1; } .off .glow{ opacity:0; animation:none; } .off .num{ color:#6A6E74; }
/* ----- przyciski trybów ----- */
.mr{ display:grid; grid-template-columns:repeat(auto-fit, minmax(max(var(--bs, 56px), calc((100% - 3 * var(--s1)) / 4)), 1fr)); gap:var(--s1); }
.mb i em{ display:block; font-style:normal; font-size:11px; font-weight:600; line-height:1.1; max-width:calc(100% - 6px); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .mb i.v{ flex-direction:column; gap:0; } .mb i.v ha-icon{ width:16px; height:16px; --mdc-icon-size:16px; } .mb i.v em{ font-size:10px; }
.mb{ display:flex; flex-direction:column; align-items:center; gap:4px; min-width:0; font-size:var(--fs-xs); line-height:1.15; color:#4A4E54; }
.mb i{ width:var(--bs, 56px); height:var(--bs, 56px); border-radius:var(--r-md); display:flex; align-items:center; justify-content:center; background:var(--hg-inner-bg, var(--hg-tile-bg)); box-shadow:var(--hg-inner-hi, none); color:#2A2D31; font-style:normal; transition: background .2s, color .2s, transform .12s, box-shadow .2s; }
.mb i ha-icon{ width:24px; height:24px; --mdc-icon-size:24px; } .mb:active i{ transform:scale(.92); }
@media (hover:hover) and (pointer:fine){ .mb:hover i{ background:var(--hg-inner-bg-h, var(--hg-tile-bg)); } }
.mb span{ max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .mb .sh{ display:none; }
.mb.act i{ background:color-mix(in srgb, var(--mc) 26%, transparent); color:var(--mx, var(--hg-accent-tx)); box-shadow:var(--hg-inner-hi, none), 0 0 18px color-mix(in srgb, var(--mc) 30%, transparent); } .mb.act{ color:#1E2023; font-weight:600; }
.mb.pw.on i{ background:var(--hg-inner-bg-h, rgba(0,0,0,.08)); color:#1E2023; } .mb.pw.off i{ background:#6A6E74; color:#FFFFFF; } .mb.pw.off{ color:#1E2023; font-weight:600; }
.tight .mb span{ display:none; }
/* rozwinięte tryby na stałej wysokości: warstwa nad pokrętłem */
.ov .xp{ position:absolute; left:var(--s2); right:var(--s2); top:var(--xt, 48px); bottom:var(--xbm, 90px); display:block; z-index:3; border-radius:var(--r-md); padding:var(--s1);
  background:var(--hg-ov-bg); box-shadow:0 8px 24px rgba(0,0,0,.18); overflow:auto; scrollbar-width:none;
  opacity:0; transform:translateY(8px) scale(.98); visibility:hidden; transition: opacity .18s ease, transform .18s ease, visibility 0s linear .18s; }
.ov .xp.open{ opacity:1; transform:none; visibility:visible; transition: opacity .18s ease, transform .18s ease; }
.ov .xi{ overflow:visible; } .ov .xi > *{ opacity:1; transform:none; padding-top:0; } .ovt .xp .mb span{ display:none; }
.mw{ display:flex; flex-direction:column; }
.mr.top{ grid-template-columns:repeat(auto-fit, minmax(var(--bs, 56px), calc((100% - 3 * var(--s1)) / 4))); justify-content:start; }
.xp{ display:grid; grid-template-rows:0fr; transition: grid-template-rows .18s ease; } .xp.open{ grid-template-rows:1fr; }
.xi{ min-height:0; overflow:hidden; } .xi > *{ padding-top:var(--s1); opacity:0; transform:translateY(-6px); transition: opacity .18s ease, transform .18s ease; } .xp.open .xi > *{ opacity:1; transform:none; }
.xb i ha-icon{ transition: transform .18s ease; } .xb[aria-expanded=true] i ha-icon{ transform:rotate(180deg); } .xb[aria-expanded=true] i{ background:var(--hg-inner-bg-h, rgba(0,0,0,.08)); }
.xp.open ~ * .fanc, .mw:has(.xp.open) .fanc{ display:none; }
@container (max-width: 268px){ .fanc{ display:none; } }
.mm.mx{ flex-wrap:wrap; }
@container (max-width: 460px){ .mb .fl{ display:none; } .mb .sh{ display:inline; } }
/* ----- kompakt (strony pokoi): nazwa + nastawa, szklany suwak, tryby ----- */
.c1{ display:flex; align-items:center; gap:var(--s1); min-height:44px; }
.c1 .nm{ flex:1; min-width:0; display:flex; flex-direction:column; line-height:1.25; }
.c1 .nm b{ font-size:var(--fs-sm); font-weight:600; color:#1E2023; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.c1 .nm span{ font-size:var(--fs-xs); font-weight:600; color:var(--mt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.c1 .tr{ display:grid; grid-template-columns:44px auto 44px; align-items:center; }
.c1 .sb{ position:static; margin:0; width:44px; height:44px; border-radius:50%; } .c1 .sb ha-icon{ width:22px; height:22px; }
.c1 .num{ font-size:32px; text-align:center; padding:0 .22em; } .c1 .num.rng{ font-size:22px; }
@container (max-width: 340px){ .c1{ flex-wrap:wrap; row-gap:4px; } .c1 .nm{ flex:1 1 100%; } .c1 .nm b, .c1 .nm span{ white-space:normal; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; } .c1 .tr{ margin:0 auto; } .c1 .num{ font-size:28px; } }
.pill{ position:relative; height:40px; border-radius:20px; cursor:pointer; touch-action:pan-y; outline:none; background:var(--hg-inner-bg, var(--hg-tile-bg)); box-shadow:var(--hg-inner-hi, none); }
.pill .pg{ position:absolute; inset:0; border-radius:inherit; opacity:.24; }
.pill .pf{ position:absolute; inset:0; border-radius:inherit; clip-path:inset(0 calc(100% - var(--pp) - 20px) 0 0 round 20px); transition:clip-path .3s cubic-bezier(.2,0,0,1); box-shadow:0 0 14px var(--mg); }
.pill .pc{ position:absolute; top:9px; bottom:9px; width:2px; margin-left:-1px; border-radius:1px; left:calc(20px + (100% - 40px) * var(--pcf)); background:var(--hg-ink, #000); opacity:.45; }
.pill .pk{ position:absolute; top:4px; left:calc(20px + (100% - 40px) * var(--ppf)); width:32px; height:32px; margin-left:-16px; border-radius:50%; background:var(--hg-thumb); box-shadow:var(--hg-thumb-sh); border:3px solid var(--mc); transition:left .3s cubic-bezier(.2,0,0,1), transform .15s; }
.drag .pill .pk, .drag .pill .pf{ transition:none; } .drag .pill .pk{ transform:scale(1.12); }
.pill:focus-visible .pk{ outline:2px solid var(--hg-accent); outline-offset:2px; }
.off .pill .pf, .off .pill .pg{ filter:grayscale(1); opacity:.3; } .off .pill .pk{ border-color:#A3A9B1; }
.c2{ display:flex; align-items:center; gap:var(--s1); } .c2 .kb{ margin-left:auto; }
.mm{ display:flex; gap:6px; flex:none; } .mm .mb span{ display:none; } .mm .mb i{ width:44px; height:44px; border-radius:var(--r-sm); } .mm .mb i ha-icon{ width:20px; height:20px; --mdc-icon-size:20px; }
@media (prefers-reduced-motion: reduce){ .xp, .xi > *, .xb i ha-icon, .ring .kn, .ring .val, .pill .pk, .pill .pf{ transition:none; } }
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
  _lim(s) { const a = s.attributes, cf = this._hass && this._hass.config, f = !!(cf && cf.unit_system && cf.unit_system.temperature === '°F'); const mn = Number(a.min_temp ?? (f ? 60 : 16)), mx = Number(a.max_temp ?? (f ? 86 : 30)); return { step: a.target_temp_step || (f ? 1 : 0.5), mn, mx: mx > mn ? mx : mn + 1 }; }
  _stat(st, t) { const m = HG_AC_MODE[st] || HG_AC_MODE.cool; if (st === 'off') return hgTr('Wyłączona', 'Off'); return (st === 'fan_only' || st === 'dry' || t == null) ? m.l : hgTr(`${m.l} do ${H.fmt(t)}°`, `${m.l} to ${H.fmt(t)}°`); }
  /* gradient temperatury: kolory jak w karcie pogody (zimno -> ciepło), liczone dla zakresu nastaw */
  _stops(mn, mx) { const n = 6; return Array.from({ length: n }, (_, i) => { const v = mn + (mx - mn) * i / (n - 1); return `<stop offset="${(i / (n - 1) * 100).toFixed(0)}%" stop-color="${HGWx.tcol(v)}"/>`; }).join(''); }
  _numHtml(v) { const s = H.fmt(v), m = /^(-?\d+)([.,]\d+)?$/.exec(s); return m ? `${m[1]}${m[2] ? `<small>${m[2]}</small>` : ''}` : H.esc(s); }
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
    const rng = t == null && a.target_temp_low != null && a.target_temp_high != null;   // heat_cool z zakresem: tylko podgląd (bez przeciągania)
    const act = on && /^(heating|cooling|drying|fan|preheating|defrosting)$/.test(a.hvac_action || '');
    const sty = `--mc:${m.c};--mx:${m.x};--mg:${m.g};--mt:var(--hg-ac-${m.t}-tx);--pp:${t != null ? (fr(t) * 100).toFixed(2) : 0}%;--ppf:${t != null ? fr(t).toFixed(4) : 0};--pcf:${cur != null ? fr(cur).toFixed(4) : 0}`;
    const pw = `<button class="mb pw ${on ? 'on' : 'off'}" data-act="toggle" aria-pressed="${on}" aria-label="${on ? hgTr('Wyłącz klimatyzację', 'Turn off air conditioning') : hgTr('Włącz klimatyzację', 'Turn on air conditioning')}" title="${on ? hgTr('Wyłącz', 'Turn off') : hgTr('Włącz', 'Turn on')}"><i>${H.icon('mdi:power')}</i><span class="fl">${on ? hgTr('Włączona', 'On') : hgTr('Wyłączona', 'Off')}</span><span class="sh">${on ? hgTr('Wł.', 'On') : hgTr('Wył.', 'Off')}</span></button>`;
    const mb = (x) => { const mm = HG_AC_MODE[x.mode] || HG_AC_MODE.cool, ac = st === x.mode; return `<button class="mb ${ac ? 'act' : ''}" data-act="mode" data-m="${x.mode}" aria-pressed="${ac}" aria-label="${H.esc(x.label)}" title="${H.esc(x.label)}" style="--mc:${mm.c};--mx:${mm.x}"><i>${H.icon(mm.i)}</i><span class="fl">${H.esc(x.label)}</span><span class="sh">${H.esc(x.short || x.label)}</span></button>`; };
    const fm = a.fan_mode, fms = a.fan_modes || [], sw = a.swing_mode, sws = a.swing_modes || [];
    const en = hgCurLang() === 'en', fv = H.esc((en ? HG_FAN_EN : HG_FAN_PL)[fm] || fm), sv = H.esc((en ? HG_SWING_EN : HG_SWING_PL)[sw] || sw);
    const fan = fm && fms.length > 1 ? `<button class="mb" data-act="fan" aria-label="${hgTr(`Nawiew: ${fv} (zmień)`, `Fan: ${fv} (change)`)}" title="${hgTr(`Nawiew: ${fv} – zmień prędkość`, `Fan: ${fv} – change speed`)}"><i class="v">${H.icon('mdi:fan')}<em>${fv}</em></i><span class="fl">${hgTr('Nawiew', 'Fan')}</span><span class="sh">${hgTr('Nawiew', 'Fan')}</span></button>` : '';
    const swb = sw && sws.length > 1 ? `<button class="mb" data-act="swing" aria-label="${hgTr(`Kierunek nawiewu: ${sv} (zmień)`, `Swing: ${sv} (change)`)}" title="${hgTr(`Kierunek nawiewu: ${sv} – zmień`, `Swing: ${sv} – change`)}"><i class="v">${H.icon('mdi:arrow-oscillating')}<em>${sv}</em></i><span class="fl">${hgTr('Kierunek', 'Swing')}</span><span class="sh">${hgTr('Kier.', 'Swing')}</span></button>` : '';
    const cls = `glass ${on ? 'on' : 'off'} ${act ? 'acting' : ''} ${t == null ? 'rng0' : ''} ${c.compact ? 'compact' : ''}`;
    const open = this._isOpen();
    const am = on ? st : (this._last && hv.includes(this._last) ? this._last : null), amx = am && (modes.find((y) => y.mode === am) || { mode: am, label: (HG_AC_MODE[am] || {}).l || am });
    const actB = amx ? mb(amx).replace('class="mb ', 'class="mb cur ') : '';
    const xb = `<button class="mb xb" data-act="xp" aria-expanded="${open}" aria-label="${open ? hgTr('Zwiń tryby', 'Collapse modes') : hgTr('Wszystkie tryby', 'All modes')}" title="${open ? hgTr('Zwiń tryby', 'Collapse modes') : hgTr('Wszystkie tryby', 'All modes')}"><i>${H.icon('mdi:chevron-down')}</i><span class="fl">${hgTr('Tryby', 'Modes')}</span><span class="sh">${hgTr('Tryby', 'Modes')}</span></button>`;
    const xp = (inner) => `<div class="xp ${open ? 'open' : ''}"><div class="xi" ${open ? '' : 'inert'}>${inner}</div></div>`;
    const can = on && t != null;
    const sb = (d, ic, lab, x = '') => `<button class="cv ${x}" data-act="step" data-d="${d}" ${!can || (d < 0 ? t <= mn : t >= mx) ? 'disabled' : ''} aria-label="${lab}" title="${lab}">${H.icon(ic)}</button>`;
    const lo = hgTr('Obniż temperaturę', 'Lower temperature'), hi = hgTr('Podwyższ temperaturę', 'Raise temperature');
    const numTxt = t != null ? this._numHtml(t) : rng ? `${H.fmt(a.target_temp_low)}–${H.fmt(a.target_temp_high)}` : '–';
    const aria = `role="slider" tabindex="${can ? 0 : -1}" aria-label="${hgTr('Temperatura docelowa', 'Target temperature')}" aria-valuemin="${mn}" aria-valuemax="${mx}" aria-valuenow="${t ?? ''}" aria-valuetext="${t != null ? H.fmt(t) + '°' : ''}" ${can ? '' : 'aria-disabled="true"'}`;
    if (c.compact) {
      const sub = [this._stat(st, t), cur != null ? hgTr(`wnętrze ${H.fmt(cur)}°`, `indoor ${H.fmt(cur)}°`) : ''].filter(Boolean).join(' · ');
      const pill = `<div class="pill" ${aria}><i class="pg" style="background:linear-gradient(90deg, ${HGWx.tcol(mn)}, ${HGWx.tcol((mn + mx) / 2)}, ${HGWx.tcol(mx)})"></i><i class="pf" style="background:linear-gradient(90deg, ${HGWx.tcol(mn)}, ${HGWx.tcol((mn + mx) / 2)}, ${HGWx.tcol(mx)})"></i>${cur != null ? '<i class="pc"></i>' : ''}${t != null ? '<i class="pk"></i>' : ''}</div>`;
      return `<ha-card class="${cls}" style="${sty}"><div class="c1"><div class="nm"><b>${H.esc(c.title)}</b><span>${H.esc(sub)}</span></div><div class="tr">${sb(-1, 'mdi:minus', lo, 'sb')}<div class="num${rng ? ' rng' : ''}" aria-live="polite">${numTxt}<sup>°</sup></div>${sb(1, 'mdi:plus', hi, 'sb')}</div></div>
        ${pill}<div class="mw"><div class="c2"><div class="mm">${pw}${actB}${xb}</div>${kb}</div>${xp(`<div class="mm mx">${modes.map(mb).join('')}${fan}${swb}</div>`)}</div></ha-card>`;
    }
    /* łuk: ścieżka z pathLength=100 -> wypełnienie przez stroke-dasharray; zakres low/high jako odcinek łuku */
    const uid = this._uid || (this._uid = 'hgac' + (++hgAcUid));
    const step = (mx - mn) > 40 ? 5 : 1, tk = [];
    for (let v = Math.ceil(mn / step) * step; v <= mx + 1e-9; v += step) { const f = fr(v), mj = Math.round(v) % 5 === 0, [x0, y0] = hgAcPt(f, mj ? 80 : 83), [x1, y1] = hgAcPt(f, 88); tk.push(`M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`); }
    const vf = t != null ? fr(t) : 0, [kx, ky] = hgAcPt(vf);
    const vd = t != null ? `stroke-dasharray="${(vf * 100).toFixed(2)} 200"` : rng ? `stroke-dasharray="${((fr(a.target_temp_high) - fr(a.target_temp_low)) * 100).toFixed(2)} 200" stroke-dashoffset="${(-fr(a.target_temp_low) * 100).toFixed(2)}"` : 'stroke-dasharray="0 200"';
    const cp = cur != null ? hgAcPt(fr(cur)) : null;
    const svg = `<svg class="ring" viewBox="0 0 240 216" ${aria}><defs><linearGradient id="${uid}" gradientUnits="userSpaceOnUse" x1="20" y1="0" x2="220" y2="0">${this._stops(mn, mx)}</linearGradient></defs>
      <path class="trk" d="${HG_AC_ARC}" pathLength="100"/><path class="grd" d="${HG_AC_ARC}" pathLength="100" stroke="url(#${uid})"/><path class="tks" d="${tk.join('')}"/>
      <path class="val" d="${HG_AC_ARC}" pathLength="100" stroke="url(#${uid})" ${vd}/>${cp ? `<circle class="cur" cx="${cp[0].toFixed(2)}" cy="${cp[1].toFixed(2)}" r="4"><title>${H.esc(c.room_label)} ${H.fmt(cur)}°</title></circle>` : ''}
      ${t != null ? `<g class="kn" style="transform:translate(${kx.toFixed(2)}px, ${ky.toFixed(2)}px)"><circle r="13"/></g>` : ''}</svg>`;
    const md = `<div class="md">${H.icon(m.i)}<span>${H.esc(on ? (act ? this._actL(a.hvac_action) : m.l) : hgTr('Wyłączona', 'Off'))}</span></div>`;
    const room = this._room();
    return `<ha-card class="${cls}" style="${sty}"><div class="hd"><span class="tt">${H.esc(c.title)}${room ? ` <span>· ${H.esc(room)}</span>` : ''}</span><span class="sp"></span>${kb}</div>
      <div class="dw"><div class="dial"><div class="glow"></div>${svg}<div class="hit" aria-hidden="true"></div>
        <div class="ctr" data-act="ctr" title="${on ? hgTr('Przytrzymaj: szczegóły', 'Hold: details') : hgTr('Dotknij, aby włączyć', 'Tap to turn on')}">${md}<div class="num${rng ? ' rng' : ''}" aria-live="polite">${numTxt}<sup>°</sup></div>${cur != null ? `<div class="lab">${H.esc(c.room_label)} ${H.fmt(cur)}°</div>` : ''}</div>
        ${sb(-1, 'mdi:minus', lo, 'mn')}${sb(1, 'mdi:plus', hi, 'pl')}</div></div>
      <div class="mw"><div class="mr top">${pw}${actB}${fan ? fan.replace('class="mb"', 'class="mb fanc"') : ''}${xb}</div>${xp(`<div class="mr">${modes.map(mb).join('')}${fan}${swb}</div>`)}</div></ha-card>`;
  }
  _actL(x) { return ({ heating: hgTr('Grzeje', 'Heating'), cooling: hgTr('Chłodzi', 'Cooling'), drying: hgTr('Osusza', 'Drying'), fan: hgTr('Wentyluje', 'Fan'), preheating: hgTr('Podgrzewa', 'Preheating'), defrosting: hgTr('Odszrania', 'Defrosting') })[x] || x; }
  /* nastawa w miejscu (bez przerysowania pod palcem): gałka, łuk, cyfry, aria; zatwierdzenie z opóźnieniem */
  _setT(v, commitMs) {
    const s = H.st(this._hass, this._config.entity); if (!s) return;
    const { step, mn, mx } = this._lim(s); v = Math.max(mn, Math.min(mx, Math.round((v - mn) / step) * step + mn)); v = +v.toFixed(1);
    const prev = this._opt && this._opt.t != null ? this._opt.t : this._eff(s).t;
    if (prev !== v) H.haptic('selection');
    this._opt = { ...(this._opt || {}), t: v, ts: Date.now() };
    const R = this.$, card = R.querySelector('ha-card'), fr = (v - mn) / (mx - mn);
    if (card) {
      card.style.setProperty('--pp', (fr * 100).toFixed(2) + '%'); card.style.setProperty('--ppf', fr.toFixed(4));
      const n = R.querySelector('.num'); if (n) n.innerHTML = this._numHtml(v) + '<sup>°</sup>';
      const kn = R.querySelector('.ring .kn'); if (kn) { const [x, y] = hgAcPt(fr); kn.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`; }
      const vl = R.querySelector('.ring .val'); if (vl) { vl.setAttribute('stroke-dasharray', `${(fr * 100).toFixed(2)} 200`); vl.removeAttribute('stroke-dashoffset'); }
      if (this._config.compact) { const st = R.querySelector('.c1 .nm span'); if (st) { const cur = s.attributes.current_temperature; st.textContent = [this._stat(this._eff(s).st, v), cur != null ? hgTr(`wnętrze ${H.fmt(cur)}°`, `indoor ${H.fmt(cur)}°`) : ''].filter(Boolean).join(' · '); } }
      const b = R.querySelector('[role=slider]'); if (b) { b.setAttribute('aria-valuenow', v); b.setAttribute('aria-valuetext', H.fmt(v) + '°'); }
      R.querySelectorAll('.cv').forEach((x) => { const d = +x.dataset.d; x.toggleAttribute('disabled', d < 0 ? v <= mn : v >= mx); });
    }
    clearTimeout(this._ct); this._ct = setTimeout(() => this._commit(), commitMs);
  }
  _commit() {
    const s = H.st(this._hass, this._config.entity); if (!s || !this._opt || this._opt.t == null) return;
    if (Number(s.attributes.temperature) !== this._opt.t) H.call(this._hass, 'climate', 'set_temperature', { entity_id: this._config.entity, temperature: this._opt.t });
    this._opt.ts = Date.now();
  }
  /* punkt wskaźnika -> wartość: łuk (kąt, przerwa na dole przyciąga do bliższego końca bez przeskoku) albo suwak (x) */
  _valAt(el, e) {
    const s = H.st(this._hass, this._config.entity), { mn, mx } = this._lim(s), r = el.getBoundingClientRect();
    let f;
    if (el.classList.contains('pill')) f = (e.clientX - r.left - 20) / Math.max(1, r.width - 40);
    else {
      const k = r.width / 240, dx = e.clientX - (r.left + HG_AC_G.cx * k), dy = e.clientY - (r.top + HG_AC_G.cy * k);
      const sw = ((Math.atan2(dy, dx) * 180 / Math.PI - HG_AC_G.a0) % 360 + 360) % 360;
      f = sw <= HG_AC_G.sw ? sw / HG_AC_G.sw : (this._dragF != null ? (this._dragF > .5 ? 1 : 0) : (sw < (HG_AC_G.sw + 360) / 2 ? 1 : 0));
    }
    f = Math.max(0, Math.min(1, f)); this._dragF = f;
    return mn + f * (mx - mn);
  }
  /* trafienie w łuk (pas wokół promienia), nie w środek pokrętła */
  _onRing(svg, e) { const r = svg.getBoundingClientRect(), k = r.width / 240, d = Math.hypot(e.clientX - (r.left + HG_AC_G.cx * k), e.clientY - (r.top + HG_AC_G.cy * k)) / k; return d > 72 && d < 126; }
  afterRender() {
    if (!this._wired) {
      this._wired = true;
      const R = this.shadowRoot;
      const card = () => R.querySelector('ha-card');
      const end = (e) => {
        const g = this._g; this._g = null;
        if (g && g.kind === 'pill' && !g.on && e && e.type === 'pointerup' && Math.abs(e.clientX - g.x) < 8 && Math.abs(e.clientY - g.y) < 8) this._setT(this._valAt(g.el, e), 700);   // dotknięcie suwaka: skok do miejsca
        if (g && g.on) { card() && card().classList.remove('drag'); this._dragF = null; clearTimeout(this._ct); this._ct = setTimeout(() => this._commit(), 250); }
        if (g) setTimeout(() => { this._touching = false; this._update(true); }, 300);
        clearTimeout(this._lp); if (this._cvEl) { this._cvEl.classList.remove('prs'); this._cvEl = null; } clearTimeout(this._rd); clearInterval(this._rp);
        window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end);
      };
      this._acEnd = end;
      const startDrag = (g, e) => { g.on = true; this._touching = true; const ce = g.cap || g.el; try { ce.setPointerCapture && ce.setPointerCapture(e.pointerId); } catch (x) { /* */ } card() && card().classList.add('drag'); this._setT(this._valAt(g.el, e), 60000); };
      R.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        const p = e.composedPath(), has = (c) => p.find((n) => n.classList && n.classList.contains(c));
        const hit = has('hit'), ring = hit ? R.querySelector('.ring') : has('ring'), pill = has('pill'), cv = has('cv'), ctr = has('ctr');
        const cd = card(); if (!cd) return;
        const s = H.st(this._hass, this._config.entity), ok = !cd.classList.contains('off') && this._eff(s).t != null;
        if (ring || pill || cv || ctr) { window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end); }
        if (ring && ok && this._onRing(ring, e)) { e.preventDefault(); this._g = { kind: 'ring', el: ring, cap: p[0], x: e.clientX, y: e.clientY }; startDrag(this._g, e); return; }
        if (pill && ok) { this._g = { kind: 'pill', el: pill, x: e.clientX, y: e.clientY }; if (e.pointerType === 'mouse') { e.preventDefault(); startDrag(this._g, e); } return; }
        if ((ctr || (ring && !cv)) && !cv) {   // przytrzymanie środka: szczegóły encji
          this._lpXY = [e.clientX, e.clientY]; this._lpFired = false; clearTimeout(this._lp);
          this._lp = setTimeout(() => { this._lpFired = true; H.haptic('medium'); H.fire(this, 'hass-more-info', { entityId: this._config.entity }); }, 520);
          return;
        }
        if (cv && !cv.hasAttribute('disabled')) { this._ptrStep = true; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); cv.classList.add('prs'); const d = +cv.dataset.d, go = () => { const s2 = H.st(this._hass, this._config.entity); const t = this._eff(s2).t; if (t == null) return; this._setT(t + d * this._lim(s2).step, 700); };
          go(); clearInterval(this._rp); clearTimeout(this._rd); this._rd = setTimeout(() => { this._rp = setInterval(go, 140); }, 420); this._cvEl = cv; }
      });
      R.addEventListener('pointermove', (e) => {
        if (this._lpXY && Math.hypot(e.clientX - this._lpXY[0], e.clientY - this._lpXY[1]) > 8) { clearTimeout(this._lp); this._lpXY = null; }
        const g = this._g; if (!g) return;
        if (!g.on && g.kind === 'pill') { const dx = Math.abs(e.clientX - g.x), dy = Math.abs(e.clientY - g.y); if (dx > 6 && dx > dy) startDrag(g, e); else return; }
        if (g.on) this._setT(this._valAt(g.el, e), 60000);
      });
      R.addEventListener('pointerup', end); R.addEventListener('pointercancel', end);
      R.addEventListener('contextmenu', (e) => { if (e.composedPath().find((n) => n.classList && (n.classList.contains('ctr') || n.classList.contains('hit')))) e.preventDefault(); });
      R.addEventListener('keydown', (e) => { const b = e.composedPath()[0]; if (!b.getAttribute || b.getAttribute('role') !== 'slider') return; const s = H.st(this._hass, this._config.entity), { step, mn, mx } = this._lim(s), t = this._eff(s).t; if (t == null) return;
        const k = e.key, d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -4, PageUp: 4 }[k];
        if (d) { e.preventDefault(); this._setT(t + d * step, 700); } else if (k === 'Home' || k === 'End') { e.preventDefault(); this._setT(k === 'Home' ? mn : mx, 700); } });
    }
    if (!this._config.compact) { if (!this._ro && window.ResizeObserver) { this._ro = new ResizeObserver(() => this._fit()); this._ro.observe(this); } this._fit(); }
  }
  /* rozmiar pokrętła: z szerokości (przewijana strona) albo z wolnej wysokości (pulpit bez przewijania); przy braku miejsca chowa podpisy trybów */
  _fit() {
    const card = this.$.querySelector('ha-card'); const dw = card && card.querySelector('.dw'); if (!dw) return;
    const pg = this.getRootNode() && this.getRootNode().host, fixedH = !!(pg && pg.getAttribute && pg.getAttribute('mode') === 'wide' && !pg.hasAttribute('scroll'));
    const cs = getComputedStyle(card), W = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); if (W <= 0) return;
    const bs = W >= 420 ? 64 : 56; this.style.setProperty('--bs', bs + 'px');
    card.classList.toggle('fx', fixedH); card.classList.remove('ov', 'ovt', 'tight');
    let dz;
    if (!fixedH) dz = Math.round(Math.max(170, Math.min(300, W * 0.88)));
    else {
      const fit = () => Math.min(W, dw.clientHeight / 0.9);
      dz = fit(); if (dz < 200) { card.classList.add('tight'); dz = fit(); }
      dz = Math.round(Math.max(120, Math.min(320, dz)));
    }
    this.style.setProperty('--dz', dz + 'px');
    const xp = card.querySelector('.xp');
    if (fixedH && xp && xp.classList.contains('open')) {
      card.classList.add('ov');
      const top = card.querySelector('.mr.top'), hd = card.querySelector('.hd'), cr = card.getBoundingClientRect();
      card.style.setProperty('--xt', Math.round(hd.getBoundingClientRect().bottom - cr.top + 4) + 'px');
      card.style.setProperty('--xbm', Math.round(cr.bottom - top.getBoundingClientRect().top + 8) + 'px');
      const xi = xp.firstElementChild; if (xi.firstElementChild && xi.firstElementChild.offsetHeight > xp.clientHeight - 16) card.classList.add('ovt');
    }
  }
  disconnectedCallback() { if (this._acEnd) this._acEnd(); clearTimeout(this._rd); clearInterval(this._rp); clearTimeout(this._lp); if (this._ct) { clearTimeout(this._ct); this._ct = 0; this._commit(); } }
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
    if (a === 'toggle') {
      H.haptic('light');
      const sf = s.attributes.supported_features || 0, cur = this._eff(s).st;
      if (cur === 'off') {
        const back = c.default_mode || this._last || (s.attributes.hvac_modes || []).find((x) => x !== 'off') || 'cool';
        this._set({ state: back, any: true });
        return sf & 256 ? H.call(this._hass, 'climate', 'turn_on', id) : H.call(this._hass, 'climate', 'set_hvac_mode', { ...id, hvac_mode: back });
      }
      this._set({ state: 'off' });
      return sf & 128 ? H.call(this._hass, 'climate', 'turn_off', id) : H.call(this._hass, 'climate', 'set_hvac_mode', { ...id, hvac_mode: 'off' });
    }
    if (a === 'fan') { H.haptic('light'); const L = s.attributes.fan_modes || [], i = L.indexOf(s.attributes.fan_mode); return H.call(this._hass, 'climate', 'set_fan_mode', { ...id, fan_mode: L[(i + 1) % L.length] }); }
    if (a === 'swing') { H.haptic('light'); const L = s.attributes.swing_modes || [], i = L.indexOf(s.attributes.swing_mode); return H.call(this._hass, 'climate', 'set_swing_mode', { ...id, swing_mode: L[(i + 1) % L.length] }); }
    if (a === 'xp') return this._setOpen(!this._isOpen());
    if (a === 'mode') { H.haptic('light'); if (this._isOpen() && !el.classList.contains('cur')) { this._open = false; try { sessionStorage.setItem(this._okey(), '0'); } catch (e) { /* */ } } this._set({ state: el.dataset.m }); return H.call(this._hass, 'climate', 'set_hvac_mode', { ...id, hvac_mode: el.dataset.m }); }
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
