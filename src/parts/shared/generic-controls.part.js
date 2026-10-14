/* shared/generic-controls: Kontrolki kart ogólnych: style, domeny, suwak, krok, wartości, akcja przycisku. */
/* ===== komponenty ogólne: suwak, przycisk, lista encji, wybór, licznik, wskaźnik ===== */
/* wspólne: przełącznik i przyciski w tokenach arkuszy (lime = główny, szkło = drugorzędny) */
const HG_GEN_CSS = `
.gsw{ all:unset; cursor:pointer; flex:none; position:relative; width:46px; height:28px; border-radius:999px; background:color-mix(in srgb, currentColor 16%, transparent); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 12%, transparent); transition:background-color 150ms; }
.gsw .gkn{ position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:50%; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.3); transition:transform 150ms cubic-bezier(.2,0,0,1); }
.gsw[aria-checked=true]{ background:var(--hg-accent); box-shadow:none; } .gsw[aria-checked=true] .gkn{ transform:translateX(18px); } .gsw:disabled{ opacity:.4; cursor:default; }
.gb{ all:unset; cursor:pointer; box-sizing:border-box; flex:none; height:36px; padding:0 16px; border-radius:999px; display:inline-flex; align-items:center; justify-content:center; gap:8px; font-size:13px; font-weight:500;
  background:color-mix(in srgb, currentColor 8%, transparent); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 12%, transparent); transition:background-color 150ms, transform 150ms, box-shadow 150ms; }
.gb.ok, .gb[aria-pressed=true]{ background:var(--hg-accent); color:var(--hg-on-accent); box-shadow:none; font-weight:600; } .gb:disabled{ opacity:.4; cursor:default; } .gb ha-icon{ width:18px; height:18px; --mdc-icon-size:18px; }
.gb.r{ width:44px; height:44px; padding:0; } .gb.r ha-icon{ width:22px; height:22px; --mdc-icon-size:22px; }
:is(.gb, .gsw, .gt, [role=slider], .gbig):focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
:is(.gb, .gbig):active:not(:disabled){ transform:scale(.96); }
@media (prefers-reduced-motion:reduce){ .gsw .gkn, .gb, .gfl{ transition:none !important; } }
.gic{ flex:none; width:40px; height:40px; border-radius:12px; display:grid; place-items:center; background:color-mix(in srgb, currentColor 8%, transparent); transition:background-color 150ms, color 150ms; }
.gic ha-icon{ width:22px; height:22px; --mdc-icon-size:22px; } .gic.on{ background:color-mix(in srgb, var(--hg-accent) 22%, transparent); color:var(--hg-accent-tx, var(--hg-accent)); }
button.gic{ all:unset; cursor:pointer; flex:none; width:40px; height:40px; border-radius:12px; display:grid; place-items:center; background:color-mix(in srgb, currentColor 8%, transparent); }
button.gic.on{ background:color-mix(in srgb, var(--hg-accent) 22%, transparent); color:var(--hg-accent-tx, var(--hg-accent)); }
.gh{ display:flex; align-items:center; gap:12px; min-width:0; } .gn{ flex:1; min-width:0; display:flex; flex-direction:column; }
.gn b{ font-size:15px; font-weight:600; letter-spacing:-.01em; line-height:1.25; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow-wrap:anywhere; } .gn small{ font-size:12px; opacity:.66; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.gv{ font-size:15px; font-weight:600; font-variant-numeric:tabular-nums; white-space:nowrap; } .gv small{ font-size:12px; font-weight:500; opacity:.66; margin-left:2px; }
.un{ opacity:.55; }
`;
const hgDom = (e) => String(e || '').split('.')[0];
const HG_TOGGLE_DOM = ['light', 'switch', 'fan', 'input_boolean', 'automation', 'siren', 'humidifier', 'climate', 'media_player', 'water_heater', 'vacuum', 'lock', 'cover', 'valve'];
const HG_PRESS_DOM = ['script', 'scene', 'button', 'input_button', 'automation'];
/* model suwaka: wartość, zakres i zapis wg domeny */
const hgSlider = (h, e) => { const s = H.st(h, e), d = hgDom(e), a = (s && s.attributes) || {}, on = !!s && !['off', 'unavailable', 'unknown', 'closed', 'idle', 'standby'].includes(s.state);
  const r = { d, s, on, min: 0, max: 100, step: 1, unit: '%', v: 0, ok: H.ok(s), label: hgTr('Poziom', 'Level') };
  if (!s) return r;
  if (d === 'light') { r.v = s.state === 'on' ? (a.brightness == null ? 100 : Math.round(a.brightness / 2.55)) : 0; r.label = hgTr('Jasność', 'Brightness'); r.ok = r.ok && (a.supported_color_modes || []).some((m) => m !== 'onoff');
    r.set = (v) => (v <= 0 ? H.call(h, 'light', 'turn_off', { entity_id: e }) : H.call(h, 'light', 'turn_on', { entity_id: e, brightness_pct: v })); }
  else if (d === 'media_player') { r.v = Math.round((a.volume_level || 0) * 100); r.label = hgTr('Głośność', 'Volume'); r.ok = r.ok && a.volume_level != null; r.set = (v) => H.call(h, 'media_player', 'volume_set', { entity_id: e, volume_level: v / 100 }); }
  else if (d === 'fan') { r.v = s.state === 'on' ? (a.percentage == null ? 100 : a.percentage) : 0; r.step = a.percentage_step || 1; r.label = hgTr('Prędkość', 'Speed');
    r.set = (v) => (v <= 0 ? H.call(h, 'fan', 'turn_off', { entity_id: e }) : H.call(h, 'fan', 'set_percentage', { entity_id: e, percentage: Math.round(v) })); }
  else if (d === 'cover' || d === 'valve') { r.v = a.current_position ?? a.current_valve_position ?? (s.state === 'open' ? 100 : 0); r.label = hgTr('Otwarcie', 'Position'); r.ok = r.ok && (a.current_position != null || a.current_valve_position != null);
    r.set = (v) => (d === 'cover' ? H.call(h, 'cover', 'set_cover_position', { entity_id: e, position: Math.round(v) }) : H.call(h, 'valve', 'set_valve_position', { entity_id: e, position: Math.round(v) })); }
  else if (d === 'input_number' || d === 'number') { r.min = +a.min || 0; r.max = a.max == null ? 100 : +a.max; r.step = +a.step || 1; r.unit = a.unit_of_measurement || ''; r.v = parseFloat(s.state); if (!isFinite(r.v)) r.v = r.min; r.on = true; r.label = hgTr('Wartość', 'Value');
    r.set = (v) => H.call(h, d, 'set_value', { entity_id: e, value: v }); }
  else r.ok = false;
  return r; };
const hgStepRound = (v, m) => { const n = Math.round((v - m.min) / m.step) * m.step + m.min, dp = (String(m.step).split('.')[1] || '').length; return +Math.max(m.min, Math.min(m.max, n)).toFixed(dp); };
const hgFmtV = (v, m) => `${H.fmt(v, (String(m.step).split('.')[1] || '').length)}${m.unit ? `<small>${H.esc(m.unit)}</small>` : ''}`;

/* --- przycisk: skrypt, scena, button.press, automatyzacja albo dowolna akcja (tap_action) --- */
const hgPress = (node, h, e, act) => { if (act) return H.action(node, h, act); const d = hgDom(e);
  if (d === 'script') return H.call(h, 'script', 'turn_on', { entity_id: e }); if (d === 'scene') return H.call(h, 'scene', 'turn_on', { entity_id: e });
  if (d === 'button' || d === 'input_button') return H.call(h, d, 'press', { entity_id: e }); if (d === 'automation') return H.call(h, 'automation', 'trigger', { entity_id: e });
  if (d === 'lock') { const s = H.st(h, e); return H.call(h, 'lock', s && s.state === 'locked' ? 'unlock' : 'lock', { entity_id: e }); }
  return H.call(h, 'homeassistant', 'toggle', { entity_id: e }); };
