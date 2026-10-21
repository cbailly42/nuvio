/* shared/compact-cards: Wspólne style i nagłówek kart ogólnych 0.9 (zegar, notatka, baterie, otwarcia…). */
/* ===== Karty ogólne 0.9: zegar, notatka, obraz / iframe, baterie, otwarcia, światło, historia, termostat, odkurzacz, mini odtwarzacz, duża wartość, słońce, aktualizacje =====
   Każda karta: szkło, ha-card jest kontenerem (container queries), więc treść dopasowuje się do rozmiaru S / M / L kafelka. */
const HG_G14_CSS = HG_GEN_CSS + U(`
ha-card.glass{ container-type:inline-size; height:auto; min-height:100%; display:flex; flex-direction:column; gap:10px; padding:14px; min-width:0; }
.ph{ display:flex; flex-direction:column; gap:4px; font-size:12.5px; opacity:.7; } .ph b{ font-size:14px; opacity:1; }
.ls{ display:flex; flex-direction:column; gap:2px; min-width:0; overflow:auto; }
.li{ display:flex; align-items:center; gap:10px; min-height:40px; padding:4px 2px; min-width:0; } .li + .li{ border-top:1px solid color-mix(in srgb, currentColor 8%, transparent); }
.li > ha-icon{ width:20px; height:20px; flex:none; opacity:.85; } .li .nm{ flex:1; min-width:0; font-size:13.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.li .vl{ flex:none; font-size:13px; font-weight:600; font-variant-numeric:tabular-nums; } .li.al .vl, .li.al > ha-icon{ color:var(--hg-accent-tx, var(--hg-accent)); }
.bar{ position:relative; flex:none; width:64px; height:6px; border-radius:3px; background:color-mix(in srgb, currentColor 12%, transparent); overflow:hidden; } .bar i{ position:absolute; inset:0 auto 0 0; border-radius:3px; background:var(--hg-accent); }
.bar.lo i{ background:#FF6B57; } .bar.md i{ background:#F5B83D; }
.big{ font-size:44px; font-weight:600; letter-spacing:-.03em; line-height:1; font-variant-numeric:tabular-nums; } .big small{ font-size:.4em; font-weight:500; opacity:.7; margin-left:3px; letter-spacing:0; }
.row{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; } .sp{ flex:1; }
.cnt{ margin-left:auto; flex:none; font-size:12px; font-weight:600; padding:3px 10px; border-radius:999px; background:color-mix(in srgb, currentColor 8%, transparent); } .cnt.al{ background:var(--hg-accent); color:var(--hg-on-accent); }
input[type=range].rg{ -webkit-appearance:none; appearance:none; width:100%; height:44px; background:transparent; margin:0; }
input[type=range].rg::-webkit-slider-runnable-track{ height:14px; border-radius:7px; background:linear-gradient(90deg, var(--hg-accent) var(--v, 0%), color-mix(in srgb, currentColor 12%, transparent) var(--v, 0%)); }
input[type=range].rg::-webkit-slider-thumb{ -webkit-appearance:none; width:26px; height:26px; margin-top:-6px; border-radius:50%; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.3); }
input[type=range].rg::-moz-range-track{ height:14px; border-radius:7px; background:color-mix(in srgb, currentColor 12%, transparent); } input[type=range].rg::-moz-range-progress{ height:14px; border-radius:7px; background:var(--hg-accent); }
input[type=range].rg::-moz-range-thumb{ width:26px; height:26px; border:0; border-radius:50%; background:#fff; }
input[type=range].rg:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; border-radius:8px; }
@container (max-width: 240px){ ha-card.glass{ padding:12px; gap:8px; } .big{ font-size:34px; } .bar{ width:40px; } .hide-s{ display:none !important; } .gic{ width:34px; height:34px; } .gn b{ font-size:14px; } }
@container (max-width: 170px){ .big{ font-size:28px; } .li .vl{ font-size:12px; } .bar{ display:none; } .hide-xs{ display:none !important; } .gb{ padding:0 10px; } }
@container (min-width: 420px){ .big{ font-size:56px; } }
`);
const hgEnts = (h, dom, dc) => Object.keys(h.states).filter((e) => (!dom || dom.includes(hgDom(e))) && (!dc || dc.includes(h.states[e].attributes.device_class)) && !((h.entities || {})[e] || {}).hidden);
const hgAgo14 = (iso) => { const t = Date.parse(iso); if (!isFinite(t)) return ''; const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? hgT('common.just_now') : m < 60 ? hgT('common.ago_minutes', { m }) : m < 1440 ? hgT('common.ago_hours', { h: Math.round(m / 60) }) : hgT('common.ago_days_short', { d: Math.round(m / 1440) }); };
const hgMore = (n, e) => { if (e) H.fire(n, 'hass-more-info', { entityId: e }); };
const hgHead = (ic, nm, sub, on, right = '') => `<div class="gh"><span class="gic${on ? ' on' : ''}">${H.icon(ic)}</span><span class="gn"><b>${H.esc(nm)}</b>${sub ? `<small>${sub}</small>` : ''}</span>${right}</div>`;
