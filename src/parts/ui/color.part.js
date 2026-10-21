/* ===== ui/color: własny wybór koloru zamiast natywnego <input type=color> (DESIGN.md: żadnych natywnych kontrolek).
   Pole zostaje w kodzie (name, value, zdarzenia input i change działają jak wcześniej), ale klik i Enter otwierają szklany popover:
   pole nasycenia i jasności, suwak odcienia w stylu suwaków Nuvio, pole HEX i szybkie kolory z limonką Nuvio.
   input leci przy każdej zmianie (podgląd na żywo), change raz przy zamknięciu. Podpinane przez hgSelWatch w każdym shadow root. ===== */
const HG_COLOR_SW = ['#63D71E', '#FFFFFF', '#0B0F0A', '#5AA2FF', '#2DD4BF', '#F5B53D', '#FF7A45', '#FF5A6E', '#A78BFA', '#94A3B8'];
const hgColorHex = (s) => { s = String(s || '').trim().replace(/^#?/, '#'); if (/^#[0-9a-f]{3}$/i.test(s)) s = '#' + s.slice(1).split('').map((c) => c + c).join(''); return /^#[0-9a-f]{6}$/i.test(s) ? s.toUpperCase() : null; };
const hgColorHsv = (hex) => { const n = parseInt((hgColorHex(hex) || '#63D71E').slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  const h = !d ? 0 : mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, mx ? d / mx : 0, mx]; };
const hgColorRgb = (h, s, v) => { const f = (k) => { const x = (k + h / 60) % 6; return v - v * s * Math.max(0, Math.min(x, 4 - x, 1)); };
  return '#' + [f(5), f(3), f(1)].map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('').toUpperCase(); };
const HG_COLOR_CSS = `
.pop:has(> .hgc){ max-height:none; overflow:visible; padding:12px; background:var(--hg-glass-sheen, none), linear-gradient(var(--hg-chrome-solid, rgba(30,30,33,.96)), var(--hg-chrome-solid, rgba(30,30,33,.96))), var(--hg-panel-flat, #1e1f23); }   /* pełne tło: kolory pod spodem nie przebijają */
.hgc{ width:240px; display:flex; flex-direction:column; gap:12px; }
.hgc-sv{ position:relative; height:140px; border-radius:14px; touch-action:none; cursor:crosshair; outline:none;
  background:linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, hsl(var(--h) 100% 50%)); box-shadow:inset 0 0 0 1px rgba(255,255,255,.12); }
.hgc-sv i{ position:absolute; left:var(--x); top:var(--y); width:18px; height:18px; margin:-9px 0 0 -9px; border-radius:50%; background:var(--c); box-shadow:0 0 0 3px #fff, 0 2px 8px rgba(0,0,0,.45); pointer-events:none; }
.hgc-sv:focus-visible{ box-shadow:0 0 0 2px var(--hg-accent, #63D71E); }
.hgc-hue{ -webkit-appearance:none; appearance:none; width:100%; height:28px; margin:0; background:transparent; cursor:pointer; }
.hgc-hue::-webkit-slider-runnable-track{ height:10px; border-radius:9px; background:linear-gradient(90deg, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00); }
.hgc-hue::-moz-range-track{ height:10px; border-radius:9px; background:linear-gradient(90deg, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00); }
.hgc-hue::-webkit-slider-thumb{ -webkit-appearance:none; width:22px; height:22px; margin-top:-6px; border-radius:50%; background:hsl(var(--h) 100% 50%); box-shadow:0 0 0 3px #fff, 0 2px 8px rgba(0,0,0,.35); transition:transform var(--hg-t-fast, 120ms) var(--hg-ease-out, ease-out); }
.hgc-hue::-moz-range-thumb{ width:22px; height:22px; border:0; border-radius:50%; background:hsl(var(--h) 100% 50%); box-shadow:0 0 0 3px #fff, 0 2px 8px rgba(0,0,0,.35); }
.hgc-hue:hover::-webkit-slider-thumb, .hgc-hue:active::-webkit-slider-thumb{ transform:scale(1.12); } .hgc-hue:focus-visible{ outline:2px solid var(--hg-accent, #63D71E); outline-offset:2px; border-radius:9px; }
.hgc-row{ display:flex; align-items:center; gap:10px; } .hgc-pv{ width:40px; height:40px; flex:none; border-radius:12px; background:var(--c); box-shadow:inset 0 0 0 1px rgba(255,255,255,.18); }
.hgc-hx{ flex:1; min-width:0; display:flex; align-items:center; gap:8px; height:40px; padding:0 12px; border-radius:12px; background:var(--hg-inner-bg, rgba(127,127,127,.14)); box-shadow:var(--hg-inner-hi, none); }
.hgc-hx span{ font-size:12px; font-weight:600; opacity:.6; } .hgc-hx input{ all:unset; flex:1; min-width:0; width:100%; font:inherit; font-size:14px; font-variant-numeric:tabular-nums; letter-spacing:.04em; text-transform:uppercase; }
.hgc-hx:focus-within{ box-shadow:0 0 0 2px var(--hg-accent, #63D71E); } .hgc-hx.bad{ box-shadow:0 0 0 2px #E5484D; }
.hgc-sl{ font-size:11.5px; font-weight:600; opacity:.6; margin:0 0 -4px 2px; }
.hgc-sws{ display:grid; grid-template-columns:repeat(5, 1fr); gap:8px; }
.hgc-sw{ aspect-ratio:1; border-radius:50%; background:var(--c) !important; box-shadow:inset 0 0 0 1px rgba(127,127,127,.35); transition:transform var(--hg-t-fast, 120ms) var(--hg-ease-out, ease-out); }
.hgc-sw:hover{ transform:scale(1.08); } .hgc-sw[aria-pressed=true]{ box-shadow:inset 0 0 0 1px rgba(127,127,127,.35), 0 0 0 2px var(--hg-panel-flat, #1e1f23), 0 0 0 4px var(--hg-accent, #63D71E); }
.hgc-sw:focus-visible{ outline:2px solid var(--hg-accent, #63D71E); outline-offset:2px; }
.hgc .acts{ margin-top:0; } .hgc .btn{ height:40px; }
@media (max-height:760px){ .hgc-sv{ height:110px; } .hgc{ gap:10px; } }
@media (pointer:coarse){ .hgc .btn, .hgc-hx, .hgc-pv{ height:44px; } .hgc-pv{ width:44px; } }`;
/* wygląd pola w miejscu natywnego (jeden <style> w każdym shadow root) */
const HG_COLOR_FIELD_CSS = `input[type=color][data-hgc]{ -webkit-appearance:none; appearance:none; background:var(--hgc, #63D71E) !important; border:0; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(255,255,255,.22), 0 1px 3px rgba(0,0,0,.25); }
input[type=color][data-hgc]::-webkit-color-swatch-wrapper{ padding:0; } input[type=color][data-hgc]::-webkit-color-swatch{ border:0; background:transparent !important; } input[type=color][data-hgc]::-moz-color-swatch{ border:0; background:transparent !important; }`;
const hgColor = window.__hgColor || (window.__hgColor = {
  cur: null,
  open(inp) {
    if (this.cur) this.cur.close(); if (typeof hgOverlay === 'undefined') return;
    const v0 = hgColorHex(inp.value) || '#63D71E'; let [h, s, v] = hgColorHsv(v0), val = v0;
    const lab = inp.getAttribute('aria-label') || (inp.closest('label') && inp.closest('label').textContent.trim()) || hgT('ui.color.colour');
    const html = `<style>${HG_COLOR_CSS}</style><div class="hgc" aria-label="${H.esc(lab)}">
      <div class="hgc-sv" role="slider" tabindex="0" aria-label="${H.esc(hgT('ui.color.saturation_and_brightness'))}"><i></i></div>
      <input class="hgc-hue" type="range" min="0" max="359" step="1" aria-label="${H.esc(hgT('ui.color.hue'))}">
      <div class="hgc-row"><span class="hgc-pv" aria-hidden="true"></span><label class="hgc-hx"><span>#</span><input class="hgc-in" maxlength="7" spellcheck="false" autocomplete="off" inputmode="text" aria-label="${H.esc(hgT('ui.color.hex_colour_code'))}"></label></div>
      <div class="hgc-sl">${H.esc(hgT('ui.color.swatches'))}</div>
      <div class="hgc-sws" role="group" aria-label="${H.esc(hgT('ui.color.swatches'))}">${HG_COLOR_SW.map((c) => `<button type="button" class="hgc-sw" data-c="${c}" style="--c:${c}" aria-pressed="false" aria-label="${H.esc(c === '#63D71E' ? hgT('ui.color.nuvio_lime') : c)}" title="${H.esc(c === '#63D71E' ? hgT('ui.color.nuvio_lime_title', { hex: c }) : c)}"></button>`).join('')}</div>
      <div class="acts"><button type="button" class="btn primary hgc-ok">${H.esc(hgT('common.done'))}</button></div></div>`;
    const P = hgOverlay.popover(this.anchor(inp), html, { onClose: () => { this.cur = null; if (val !== v0) inp.dispatchEvent(new Event('change', { bubbles: true, composed: true })); try { inp.focus({ preventScroll: true }); } catch (e) { /* bez fokusu */ } } });
    const el = P.el, sv = el.querySelector('.hgc-sv'), hue = el.querySelector('.hgc-hue'), hx = el.querySelector('.hgc-in');
    const paint = (from) => { el.querySelector('.hgc').style.cssText = `--h:${Math.round(h)};--c:${val};--x:${(s * 100).toFixed(1)}%;--y:${((1 - v) * 100).toFixed(1)}%`;
      sv.setAttribute('aria-valuetext', `${H.pct(Math.round(s * 100))}, ${H.pct(Math.round(v * 100))}`); if (from !== 'hue') hue.value = Math.round(h); if (from !== 'hex') { hx.value = val.slice(1); hx.parentNode.classList.remove('bad'); }
      for (const b of el.querySelectorAll('.hgc-sw')) b.setAttribute('aria-pressed', String(b.dataset.c === val)); };
    const set = (from) => { val = hgColorRgb(h, s, v); inp.value = val.toLowerCase(); inp.style.setProperty('--hgc', val); inp.dispatchEvent(new Event('input', { bubbles: true, composed: true })); paint(from); };
    const pick = (hex, from) => { const c = hgColorHex(hex); if (!c) return false; const [h2, s2, v2] = hgColorHsv(c); if (s2 > 0 && v2 > 0) h = h2; s = s2; v = v2; val = c; inp.value = c.toLowerCase(); inp.style.setProperty('--hgc', c); inp.dispatchEvent(new Event('input', { bubbles: true, composed: true })); paint(from); return true; };
    const at = (e) => { const r = sv.getBoundingClientRect(); s = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); v = 1 - Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)); set(); };
    sv.addEventListener('pointerdown', (e) => { e.preventDefault(); sv.focus({ preventScroll: true }); sv.setPointerCapture(e.pointerId); at(e); });
    sv.addEventListener('pointermove', (e) => { if (sv.hasPointerCapture(e.pointerId)) at(e); });
    sv.addEventListener('keydown', (e) => { const st = e.shiftKey ? 0.1 : 0.01, m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, st], ArrowDown: [0, -st] }[e.key]; if (!m) return; e.preventDefault(); s = Math.min(1, Math.max(0, s + m[0])); v = Math.min(1, Math.max(0, v + m[1])); set(); });
    hue.addEventListener('input', () => { h = +hue.value; set('hue'); });
    hx.addEventListener('input', () => { const ok = pick(hx.value, 'hex'); hx.parentNode.classList.toggle('bad', !ok && hx.value.replace('#', '').length >= 6); });
    hx.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); P.close(); } });
    el.addEventListener('click', (e) => { const b = e.composedPath().find((n) => n.classList && (n.classList.contains('hgc-sw') || n.classList.contains('hgc-ok'))); if (!b) return; if (b.classList.contains('hgc-ok')) return P.close(); pick(b.dataset.c); });
    paint(); this.fit(el); setTimeout(() => sv.focus({ preventScroll: true }), 30); this.cur = P; return P; },
  /* popover cały na ekranie: gdy nie mieści się ani pod, ani nad polem (telefon), przesuwamy go w górę do krawędzi */
  fit(el) { const r = el.getBoundingClientRect(), vh = innerHeight; if (r.bottom > vh - 8) el.style.top = Math.max(8, parseFloat(el.style.top || r.top) - (r.bottom - (vh - 8))) + 'px'; },
  /* ukryte pole (opacity 0 w etykiecie z własnym podglądem): popover przy etykiecie */
  anchor(inp) { const r = inp.getBoundingClientRect(); return r.width > 4 && r.height > 4 ? inp : (inp.closest('label') || inp.parentNode || inp); },
});
function hgColorUp(inp) {
  if (inp.dataset.hgc) return; inp.dataset.hgc = '1'; inp.style.setProperty('--hgc', inp.value || '#63d71e');
  const root = inp.getRootNode(); if (root && root.querySelector && !root.querySelector('style[data-hgc]')) { const st = document.createElement('style'); st.dataset.hgc = '1'; st.textContent = HG_COLOR_FIELD_CSS; (root.head || root).appendChild(st); }
  inp.addEventListener('click', (e) => { e.preventDefault(); hgColor.open(inp); });
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hgColor.open(inp); } });
  inp.addEventListener('input', () => inp.style.setProperty('--hgc', inp.value));
}
window.hgColorUp = hgColorUp;
