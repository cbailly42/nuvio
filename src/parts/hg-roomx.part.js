/* ===== pusty pokój: „Importuj z obszaru” (podgląd z polami wyboru + „Wybierz encje”) i „Utwórz własny układ” ===== */
const HG_RX_PRI = ['light', 'switch', 'fan', 'climate', 'cover', 'media_player', 'camera', 'lock', 'vacuum', 'humidifier', 'valve', 'water_heater', 'input_boolean', 'select', 'input_select', 'number', 'input_number', 'counter', 'scene', 'script', 'button', 'input_button', 'sensor', 'binary_sensor'];
const HG_RX_ICON = { light: 'mdi:lightbulb-outline', switch: 'mdi:toggle-switch-outline', fan: 'mdi:fan', climate: 'mdi:thermostat', cover: 'mdi:window-shutter', media_player: 'mdi:speaker', camera: 'mdi:cctv', lock: 'mdi:lock-outline', vacuum: 'mdi:robot-vacuum',
  humidifier: 'mdi:air-humidifier', valve: 'mdi:pipe-valve', water_heater: 'mdi:water-boiler', input_boolean: 'mdi:toggle-switch-outline', select: 'mdi:form-dropdown', input_select: 'mdi:form-dropdown', number: 'mdi:numeric', input_number: 'mdi:numeric', counter: 'mdi:counter',
  scene: 'mdi:palette-outline', script: 'mdi:script-text-outline', button: 'mdi:gesture-tap-button', input_button: 'mdi:gesture-tap-button', sensor: 'mdi:eye-outline', binary_sensor: 'mdi:checkbox-blank-circle-outline' };
const hgRxN = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');
const hgRxDom = (e) => e.split('.')[0];
const hgRxRank = (e) => { const i = HG_RX_PRI.indexOf(hgRxDom(e)); return i < 0 ? 99 : i; };
const hgRxNm = (h, e) => (h.states[e] && h.states[e].attributes.friendly_name) || e;
const HGRoomX = {
  /* kandydaci: encje przypisane do obszaru (bezpośrednio lub przez urządzenie) + bez obszaru, ale z nazwą pokoju w nazwie */
  cands(h, a) {
    const E = h.entities || {}, D = h.devices || {}, keys = [hgRxN(a.name), hgRxN(a.id).replace(/_/g, ' '), ...(a.aliases || (h.areas && h.areas[a.id] && h.areas[a.id].aliases) || []).map(hgRxN)].filter((x) => x.length >= 3), out = [];
    for (const e of Object.keys(h.states)) { if (hgRxRank(e) === 99) continue; const s = h.states[e]; if (!s || s.state === 'unavailable') continue;
      const r = E[e] || {}, ar = r.area_id || (r.device_id && D[r.device_id] && D[r.device_id].area_id) || null;
      let src = null; if (ar === a.id) src = 'area'; else if (!ar) { const f = hgRxN(s.attributes.friendly_name) + ' ' + hgRxN(e).replace(/_/g, ' '); if (keys.some((k) => f.includes(k))) src = 'name'; }
      if (!src) continue;
      const d = hgRxDom(e), dc = s.attributes.device_class, aux = !!(r.entity_category || r.hidden || r.hidden_by);
      const on = !aux && (!['sensor', 'binary_sensor', 'button', 'input_button', 'number', 'select'].includes(d) || (d === 'sensor' && ['temperature', 'humidity'].includes(dc)) || (d === 'binary_sensor' && ['door', 'window', 'motion', 'occupancy'].includes(dc)));
      out.push({ e, src, on, aux }); }
    return out.sort((x, y) => (x.src === y.src ? 0 : x.src === 'area' ? -1 : 1) || hgRxRank(x.e) - hgRxRank(y.e) || hgRxNm(h, x.e).localeCompare(hgRxNm(h, y.e)));
  },
  emptyHtml(h, a, RS) {
    const adm = typeof HGL !== 'undefined' ? HGL.canEdit(h) : !!(h.user && h.user.is_admin), vir = !!a.virtual;
    return `<ha-card class="glass rxc"><style>${HG_RX_EMPTY_CSS}</style><div class="rxe">
      <span class="rxi">${H.icon('mdi:home-plus-outline')}</span>
      <div class="rxt"><b>${hgT('roomx.no_devices_in_this')}</b>
      <p>${vir ? hgT('roomx.pick_the_entities_to')
        : hgT('roomx.import_area_hint', { name: H.esc(a.name) })}</p></div>
      <div class="rxb"><button class="rxp" data-act="rximp">${H.icon(vir ? 'mdi:checkbox-multiple-marked-outline' : 'mdi:import')}${vir ? hgT('roomx.pick_entities') : hgT('roomx.import_from_area')}</button>
        ${adm ? `<button class="rxs" data-act="rxlay">${H.icon('mdi:view-grid-plus-outline')}${hgT('roomx.create_custom_layout')}</button>` : ''}</div>
      ${vir ? '' : `<button class="rxl" data-act="area" data-a="${H.esc(a.id)}">${H.icon('mdi:cog-outline')}${hgT('roomx.area_settings')}</button>`}</div></ha-card>`;
  },
  page(card) { let n = card; while (n && n.tagName !== 'HG-PAGE' && n.tagName !== 'NUVIO-PAGE') n = n.parentNode || n.host; return n && n._editEnter ? n : null; },
  layout(card, RS) { const p = this.page(card); if (!p) return; p._editEnter(); const x = card.render(); card._html = x; card.$.innerHTML = x; if (card.afterRender) card.afterRender(); setTimeout(() => { p._eDecorate && p._eDecorate(); p._eGallery(null, RS); }, 60); },
  open(card, a, RS) { let m = document.querySelector('hg-room-import'); if (!m) { m = document.createElement('hg-room-import'); document.body.appendChild(m); } m.show(card, a, RS); },
};
window.HGRoomX = HGRoomX;
const HG_RX_EMPTY_CSS = `.rxc{ height:100%; } .rxe{ box-sizing:border-box; min-height:220px; height:100%; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:16px; padding:24px; }
.rxi{ width:48px; height:48px; border-radius:16px; display:grid; place-items:center; background:color-mix(in srgb, var(--hg-accent) 18%, transparent); color:var(--hg-accent-tx, var(--hg-accent)); } .rxi ha-icon{ --mdc-icon-size:26px; width:26px; height:26px; }
.rxt b{ display:block; font-size:17px; font-weight:600; letter-spacing:-.01em; } .rxt p{ margin:6px 0 0; max-width:52ch; font-size:14px; line-height:1.5; opacity:.72; text-wrap:pretty; }
.rxb{ display:flex; flex-wrap:wrap; gap:8px; } .rxb button, .rxl{ all:unset; box-sizing:border-box; cursor:pointer; height:44px; padding:0 18px; border-radius:999px; display:inline-flex; align-items:center; gap:8px; font-size:14px; font-weight:600; transition:background-color 150ms, transform 150ms, opacity 150ms; }
.rxb ha-icon, .rxl ha-icon{ --mdc-icon-size:20px; width:20px; height:20px; } .rxb .rxp{ background:var(--hg-accent); color:var(--hg-on-accent); } .rxb .rxs{ background:color-mix(in srgb, currentColor 9%, transparent); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 14%, transparent); }
.rxl{ height:36px; padding:0 12px 0 8px; margin-left:-8px; font-weight:500; font-size:13px; opacity:.72; } .rxl:hover{ opacity:1; } .rxb button:active, .rxl:active{ transform:scale(.96); }
.rxb button:focus-visible, .rxl:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; } @media (prefers-reduced-motion: reduce){ .rxb button, .rxl{ transition:none; } }`;
/* okno importu: osobny element w <body> (stan nie ginie przy odświeżeniu karty); tokeny kopiowane z karty pokoju */
const HG_RX_VARS = ['--hg-accent', '--hg-accent-tx', '--hg-on-accent', '--hg-glass-bg', '--hg-glass-lite', '--hg-glass-blur', '--hg-glass-sat', '--hg-tile-bg', '--hg-card-sh', '--primary-text-color', '--hg-tx', '--hg-bf'];
class HGRoomImport extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this.shadowRoot.addEventListener('click', (e) => this._click(e)); this.shadowRoot.addEventListener('input', (e) => { if (e.target.dataset.q != null) { this._q = e.target.value; this._list(); } });
    this.shadowRoot.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hide(); }); }
  show(card, a, RS) { this._card = card; this._a = a; this._RS = RS; this._h = card._hass; this._q = ''; this._ha = false; this._busy = false;
    this._c = a.virtual ? [] : HGRoomX.cands(this._h, a); this._mode = this._c.length ? 'imp' : 'pick'; this._sel = new Set(this._c.filter((x) => x.on).map((x) => x.e));
    const cs = getComputedStyle(card); for (const v of HG_RX_VARS) { const x = cs.getPropertyValue(v); if (x) this.style.setProperty(v, x.trim()); }
    this.style.color = cs.color; this._prevFocus = card.shadowRoot && card.shadowRoot.activeElement; this.hidden = false; this._paint(); requestAnimationFrame(() => { const f = this.shadowRoot.querySelector('.rxd'); if (f) f.focus(); }); }
  hide() { this.hidden = true; this.shadowRoot.innerHTML = ''; }
  _row(e, x) { const h = this._h, s = h.states[e], on = this._sel.has(e), d = hgRxDom(e), st = s ? (H.stateLabel ? H.stateLabel(s.state) : s.state) : '';
    return `<label class="rr ${on ? 'on' : ''}"><input type="checkbox" data-e="${H.esc(e)}" ${on ? 'checked' : ''}><span class="ck">${H.icon('mdi:check')}</span><span class="ri">${H.icon((s && s.attributes.icon) || HG_RX_ICON[d] || 'mdi:shape-outline')}</span>
      <span class="rt"><b>${H.esc(hgRxNm(h, e))}</b><small>${H.esc(e)}${x && x.aux ? ' · ' + hgT('roomx.auxiliary') : ''}</small></span><span class="rs">${H.esc(String(st))}${s && s.attributes.unit_of_measurement && !isNaN(+s.state) ? ' ' + H.esc(s.attributes.unit_of_measurement) : ''}</span></label>`; }
  _items() { const h = this._h;
    if (this._mode === 'imp') { const g = (src) => this._c.filter((x) => x.src === src);
      const sec = (src, t) => { const L = g(src); return L.length ? `<div class="gh">${t}<i>${L.length}</i></div>${L.map((x) => this._row(x.e, x)).join('')}` : ''; };
      return sec('area', hgT('roomx.assigned_to_the_area')) + sec('name', hgT('roomx.matching_by_name')); }
    const q = hgRxN(this._q).trim(), all = Object.keys(h.states).filter((e) => hgRxRank(e) < 99 && h.states[e].state !== 'unavailable');
    const hit = (q ? all.filter((e) => (hgRxN(hgRxNm(h, e)) + ' ' + e).includes(q)) : all).sort((x, y) => (this._sel.has(y) - this._sel.has(x)) || hgRxRank(x) - hgRxRank(y) || hgRxNm(h, x).localeCompare(hgRxNm(h, y)));
    const L = hit.slice(0, 150); return L.length ? L.map((e) => this._row(e)).join('') + (hit.length > L.length ? `<p class="mo">${hgT('roomx.showing_first', { shown: L.length, count: hit.length })}</p>` : '')
      : `<p class="mo">${hgT('roomx.no_results')}</p>`; }
  _list() { const l = this.shadowRoot.querySelector('.rl'); if (l) l.innerHTML = this._items(); this._foot(); }
  _foot() { const n = this._sel.size, b = this.shadowRoot.querySelector('[data-a="ok"]'); if (b) { b.disabled = !n || this._busy; b.lastChild.textContent = n ? hgT('roomx.add_tiles', { count: n }) : hgT('roomx.select_entities'); }
    const c = this.shadowRoot.querySelector('.cnt'); if (c) c.textContent = hgT('roomx.selected', { count: n }); }
  _paint() { const a = this._a, imp = this._mode === 'imp', adm = !!(this._h.user && this._h.user.is_admin), hasC = this._c.length;
    this.shadowRoot.innerHTML = `<style>${HG_RX_CSS}</style><div class="scr" data-a="x"></div><div class="rxd" role="dialog" aria-modal="true" tabindex="-1" aria-labelledby="rxh">
      <div class="hd"><span class="hi">${H.icon('mdi:import')}</span><div><b id="rxh">${a.virtual ? hgT('roomx.pick_entities') : hgT('roomx.import_from_named_area', { name: H.esc(a.name) })}</b><small>${hgT('roomx.choose_what_to_show')}</small></div>
        <button class="x" data-a="x" aria-label="${hgT('common.close')}">${H.icon('mdi:close')}</button></div>
      ${a.virtual ? '' : `<div class="seg" role="tablist"><button role="tab" data-a="imp" aria-selected="${imp}">${H.icon('mdi:home-import-outline')}${hgT('roomx.from_area')}<i>${hasC}</i></button><button role="tab" data-a="pick" aria-selected="${!imp}">${H.icon('mdi:checkbox-multiple-marked-outline')}${hgT('roomx.pick_entities')}</button></div>`}
      ${!imp ? `<label class="sr">${H.icon('mdi:magnify')}<input data-q value="${H.esc(this._q)}" placeholder="${hgT('roomx.search_entities')}" aria-label="${hgT('roomx.search_entities')}" autocomplete="off"></label>` : ''}
      ${imp && !hasC ? '' : ''}<div class="rl">${this._items()}</div>
      ${imp && !hasC ? `<p class="mo">${hgT('roomx.this_area_has_no')}</p>` : ''}
      ${adm && !a.virtual ? `<label class="ha"><span><b>${hgT('roomx.also_assign_to_the')}</b><small>${hgT('roomx.unassigned_move_hint', { name: H.esc(a.name) })}</small></span><button class="sw" role="switch" data-a="ha" aria-checked="${this._ha}"><i></i></button></label>` : ''}
      <div class="ft"><span class="cnt"></span><button class="sec" data-a="x">${hgT('common.cancel')}</button><button class="pri" data-a="ok">${H.icon('mdi:check')}<span></span></button></div></div>`;
    this._foot(); }
  async _click(ev) { const t = ev.target, cb = t.closest('input[type=checkbox]');
    if (cb) { const e = cb.dataset.e; cb.checked ? this._sel.add(e) : this._sel.delete(e); cb.closest('.rr').classList.toggle('on', cb.checked); return this._foot(); }
    const b = t.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (a === 'x') return this.hide();
    if (a === 'imp' || a === 'pick') { this._mode = a; this._paint(); if (a === 'pick') { const i = this.shadowRoot.querySelector('[data-q]'); if (i) i.focus(); } return; }
    if (a === 'ha') { this._ha = !this._ha; b.setAttribute('aria-checked', this._ha); return; }
    if (a === 'ok' && this._sel.size && !this._busy) { this._busy = true; this._foot(); await this._commit(); this._busy = false; this.hide(); } }
  async _commit() { const h = this._h, RS = this._RS, E = h.entities || {}, sel = [...this._sel].filter((e) => h.states[e]).sort((x, y) => hgRxRank(x) - hgRxRank(y) || hgRxNm(h, x).localeCompare(hgRxNm(h, y)));
    const L = HGL.get(RS);
    for (const e of sel) { if (!L.added.some((y) => y.e === e)) L.added.push({ e }); L.hidden = L.hidden.filter((y) => y !== e);
      const d = hgRxDom(e); if (['climate', 'camera'].includes(d)) L.size[e] = 'l'; else if (d === 'media_player') L.size[e] = 'm'; }
    HGL.set(RS, L); try { await HGL.save(h); } catch (er) { /* zapis lokalny i tak jest */ }
    if (this._ha && !window.__hgDryRun) for (const e of sel) { const r = E[e]; if (r && !r.area_id && !(r.device_id && (h.devices || {})[r.device_id] && h.devices[r.device_id].area_id)) try { await h.callWS({ type: 'config/entity_registry/update', entity_id: e, area_id: this._a.id }); } catch (er) { /* bez uprawnień lub bez rejestru */ } }
    const p = HGRoomX.page(this._card); if (p && p._eToast) p._eToast(hgT('roomx.added_count_to', { count: sel.length, name: this._a.name }));
    if (HGL.notify) HGL.notify(); this._card.rerender(); }
}
if (!customElements.get('hg-room-import')) customElements.define('hg-room-import', HGRoomImport);
const HG_RX_CSS = `:host{ position:fixed; inset:0; z-index:1000; display:grid; place-items:center; font-family:'DM Sans', system-ui, sans-serif; color-scheme:light dark; } :host([hidden]){ display:none; }
.scr{ position:absolute; inset:0; background:color-mix(in srgb, #000 42%, transparent); -webkit-backdrop-filter:var(--hg-bfo, blur(6px)); backdrop-filter:var(--hg-bfo, blur(6px)); animation:rxf 150ms ease-out; }
.rxd{ position:relative; box-sizing:border-box; width:min(560px, calc(100vw - 24px)); max-height:min(84vh, 760px); display:flex; flex-direction:column; gap:14px; padding:20px; border-radius:28px; outline:none;
  background:var(--hg-glass-bg, color-mix(in srgb, #1E242C 78%, transparent)); -webkit-backdrop-filter:var(--hg-bfo, blur(calc(var(--hg-glass-blur, 24px) * var(--hg-bf, 1))) saturate(var(--hg-glass-sat, 180%))); backdrop-filter:var(--hg-bfo, blur(calc(var(--hg-glass-blur, 24px) * var(--hg-bf, 1))) saturate(var(--hg-glass-sat, 180%)));
  box-shadow:var(--hg-card-sh, 0 20px 60px rgba(0,0,0,.35)), inset 0 0 0 1px color-mix(in srgb, currentColor 10%, transparent); animation:rxu 180ms cubic-bezier(.2,.8,.2,1); }
@media (max-width:600px){ :host{ place-items:end center; } .rxd{ width:100vw; max-height:88vh; border-radius:28px 28px 0 0; padding-bottom:calc(20px + env(safe-area-inset-bottom, 0px)); } }
@keyframes rxf{ from{ opacity:0; } } @keyframes rxu{ from{ opacity:0; transform:translateY(12px) scale(.98); } } @media (prefers-reduced-motion: reduce){ .scr, .rxd{ animation:none; } }
ha-icon{ --mdc-icon-size:20px; width:20px; height:20px; } .hd{ display:flex; gap:12px; align-items:flex-start; } .hd > div{ flex:1; min-width:0; } .hd b{ display:block; font-size:17px; font-weight:600; letter-spacing:-.01em; } .hd small{ display:block; margin-top:4px; font-size:13px; line-height:1.45; opacity:.7; }
.hi{ flex:none; width:40px; height:40px; border-radius:12px; display:grid; place-items:center; background:color-mix(in srgb, var(--hg-accent, #63D71E) 18%, transparent); color:var(--hg-accent-tx, var(--hg-accent, #63D71E)); }
button{ all:unset; box-sizing:border-box; cursor:pointer; transition:background-color 150ms, transform 150ms, opacity 150ms; } button:active{ transform:scale(.96); } button:focus-visible, input:focus-visible{ outline:2px solid var(--hg-accent, #63D71E); outline-offset:2px; }
.x{ flex:none; width:36px; height:36px; border-radius:50%; display:grid; place-items:center; background:color-mix(in srgb, currentColor 8%, transparent); }
.seg{ display:grid; grid-template-columns:1fr 1fr; gap:4px; padding:4px; border-radius:999px; background:color-mix(in srgb, currentColor 7%, transparent); } .seg button{ height:36px; border-radius:999px; display:flex; align-items:center; justify-content:center; gap:6px; font-size:13px; font-weight:500; opacity:.75; }
.seg button[aria-selected=true]{ opacity:1; background:color-mix(in srgb, currentColor 12%, transparent); font-weight:600; } .seg ha-icon{ --mdc-icon-size:18px; width:18px; height:18px; } .seg i, .gh i{ font-style:normal; font-size:12px; opacity:.6; }
.sr{ display:flex; align-items:center; gap:8px; height:44px; padding:0 14px; border-radius:999px; background:color-mix(in srgb, currentColor 7%, transparent); } .sr:focus-within{ box-shadow:0 0 0 2px var(--hg-accent, #63D71E); }
.sr input{ all:unset; flex:1; min-width:0; font-size:14px; } .sr input:focus-visible{ outline:none; } .sr ha-icon{ opacity:.6; }
.rl{ flex:1 1 auto; min-height:80px; overflow:auto; display:flex; flex-direction:column; gap:4px; margin:0 -8px; padding:0 8px; overscroll-behavior:contain; }
.gh{ display:flex; gap:6px; align-items:baseline; margin:8px 4px 2px; font-size:12px; font-weight:600; letter-spacing:.02em; text-transform:uppercase; opacity:.62; } .gh:first-child{ margin-top:0; }
.rr{ position:relative; display:flex; align-items:center; gap:10px; min-height:56px; padding:6px 12px 6px 8px; border-radius:16px; cursor:pointer; transition:background-color 150ms; } .rr:hover{ background:color-mix(in srgb, currentColor 6%, transparent); } .rr.on{ background:color-mix(in srgb, var(--hg-accent, #63D71E) 12%, transparent); }
.rr input{ position:absolute; opacity:0; width:1px; height:1px; } .ck{ flex:none; width:22px; height:22px; border-radius:7px; display:grid; place-items:center; box-shadow:inset 0 0 0 2px color-mix(in srgb, currentColor 62%, transparent); background:color-mix(in srgb, currentColor 6%, transparent); transition:background-color 150ms; }
.ck ha-icon{ --mdc-icon-size:16px; width:16px; height:16px; opacity:0; } .rr.on .ck ha-icon{ opacity:1; } .rr.on .ck{ background:var(--hg-accent, #63D71E); color:var(--hg-on-accent, #0B0F0A); box-shadow:none; } .rr:has(input:focus-visible) .ck{ outline:2px solid var(--hg-accent, #63D71E); outline-offset:2px; }
.ri{ flex:none; width:38px; height:38px; border-radius:50%; display:grid; place-items:center; background:color-mix(in srgb, currentColor 8%, transparent); } .rr.on .ri{ color:var(--hg-accent-tx, var(--hg-accent, #63D71E)); }
.rt{ flex:1; min-width:0; display:flex; flex-direction:column; } .rt b{ font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .rt small{ font-size:12px; opacity:.55; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rs{ flex:none; max-width:30%; font-size:13px; opacity:.7; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-variant-numeric:tabular-nums; } .mo{ margin:4px; font-size:13px; opacity:.66; }
.ha{ display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:16px; background:color-mix(in srgb, currentColor 6%, transparent); } .ha span{ flex:1; min-width:0; } .ha b{ display:block; font-size:14px; font-weight:600; } .ha small{ display:block; font-size:12px; opacity:.62; margin-top:2px; }
.sw{ flex:none; position:relative; width:46px; height:28px; border-radius:999px; background:color-mix(in srgb, currentColor 22%, transparent); } .sw i{ position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:50%; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.25); transition:transform 150ms; }
.sw[aria-checked=true]{ background:var(--hg-accent, #63D71E); } .sw[aria-checked=true] i{ transform:translateX(18px); }
.ft{ display:flex; align-items:center; gap:8px; } .cnt{ flex:1; font-size:13px; opacity:.66; } .ft button{ height:44px; padding:0 18px; border-radius:999px; display:inline-flex; align-items:center; gap:8px; font-size:14px; font-weight:600; }
.sec{ background:color-mix(in srgb, currentColor 9%, transparent); } .pri{ background:var(--hg-accent, #63D71E); color:var(--hg-on-accent, #0B0F0A); } .pri[disabled]{ opacity:.45; cursor:default; transform:none; }
@media (max-width:420px){ .cnt{ display:none; } .ft button{ flex:1; justify-content:center; } }`;
