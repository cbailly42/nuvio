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
  return m < 1 ? hgTr('przed chwilą', 'just now') : m < 60 ? hgTr(`${m} min temu`, `${m} min ago`) : m < 1440 ? hgTr(`${Math.round(m / 60)} godz. temu`, `${Math.round(m / 60)} h ago`) : hgTr(`${Math.round(m / 1440)} dni temu`, `${Math.round(m / 1440)} d ago`); };
const hgMore = (n, e) => { if (e) H.fire(n, 'hass-more-info', { entityId: e }); };
const hgHead = (ic, nm, sub, on, right = '') => `<div class="gh"><span class="gic${on ? ' on' : ''}">${H.icon(ic)}</span><span class="gn"><b>${H.esc(nm)}</b>${sub ? `<small>${sub}</small>` : ''}</span>${right}</div>`;

/* --- zegar --- */
class HGClockCard extends HGBase {
  defaults() { return { title: null, seconds: false, date: true, hour12: false }; }
  ents() { return []; }
  css() { return HG_G14_CSS + U(`ha-card.glass{ justify-content:center; align-items:flex-start; } .tm{ font-size:clamp(34px, 22cqi, 96px); font-weight:300; letter-spacing:-.04em; line-height:1; font-variant-numeric:tabular-nums; } .tm small{ font-size:.38em; opacity:.6; margin-left:4px; letter-spacing:0; } .dt{ font-size:14px; opacity:.75; text-transform:capitalize; } .tt{ font-size:12px; opacity:.6; font-weight:600; letter-spacing:.04em; text-transform:uppercase; }`); }
  connectedCallback() { super.connectedCallback(); clearInterval(this._ti); this._ti = setInterval(() => this.rerender(), this._config && this._config.seconds ? 1000 : 15000); }
  disconnectedCallback() { clearInterval(this._ti); }
  render() { const c = this._config, d = new Date(), loc = HG_LOC();
    const t = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12: !!c.hour12 }), s = String(d.getSeconds()).padStart(2, '0');
    return `<ha-card class="glass">${c.title ? `<span class="tt">${H.esc(c.title)}</span>` : ''}<span class="tm" role="timer" aria-live="off">${H.esc(t)}${c.seconds ? `<small>${s}</small>` : ''}</span>${c.date !== false ? `<span class="dt">${H.esc(d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' }))}</span>` : ''}</ha-card>`; }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-clock-card', HGClockCard, hgTr('Home Glass – Zegar', 'Home Glass – Clock'), hgTr('Godzina i data', 'Time and date'));

/* --- notatka (prosty markdown: **pogrubienie**, *kursywa*, listy "- ", nagłówki "# ") --- */
const hgMd = (t) => { const out = []; let ul = false;
  for (const raw of String(t || '').split(/\r?\n/)) { let l = H.esc(raw).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/`(.+?)`/g, '<code>$1</code>');
    if (/^\s*[-*] /.test(raw)) { if (!ul) { out.push('<ul>'); ul = true; } out.push(`<li>${l.replace(/^\s*[-*] /, '')}</li>`); continue; }
    if (ul) { out.push('</ul>'); ul = false; }
    if (/^#{1,3} /.test(raw)) out.push(`<h3>${l.replace(/^#{1,3} /, '')}</h3>`); else if (raw.trim()) out.push(`<p>${l}</p>`); }
  if (ul) out.push('</ul>'); return out.join(''); };
class HGNoteCard extends HGBase {
  defaults() { return { title: null, icon: 'mdi:note-text-outline', text: '' }; }
  ents() { return []; }
  css() { return HG_G14_CSS + U(`.md{ font-size:14px; line-height:1.45; overflow:auto; min-height:0; overflow-wrap:anywhere; } .md p{ margin:0 0 6px; } .md h3{ margin:4px 0 6px; font-size:15px; } .md ul{ margin:0 0 6px; padding-left:18px; } .md code{ font-size:12.5px; padding:1px 5px; border-radius:6px; background:color-mix(in srgb, currentColor 10%, transparent); }`); }
  render() { const c = this._config;
    return `<ha-card class="glass">${c.title ? hgHead(c.icon || 'mdi:note-text-outline', c.title, '', true) : ''}<div class="md">${c.text ? hgMd(c.text) : `<div class="ph"><b>${hgTr('Pusta notatka', 'Empty note')}</b>${hgTr('Dodaj treść w polu „Treść”', 'Add text in the "Text" field')}</div>`}</div></ha-card>`; }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-note-card', HGNoteCard, hgTr('Home Glass – Notatka', 'Home Glass – Note'), hgTr('Tekst z prostym formatowaniem', 'Text with simple formatting'));

/* --- obraz / strona (iframe) --- */
const hgSafeUrl = (u) => (/^(https?:\/\/|\/local\/|\/api\/|\/hacsfiles\/|\/media\/)/.test(String(u || '').trim()) ? String(u).trim() : '');
class HGImageCard extends HGBase {
  defaults() { return { url: '', mode: 'image', title: null, fit: 'cover', ratio: '16/9', refresh: 0 }; }
  ents() { return []; }
  css() { return HG_G14_CSS + U(`ha-card.glass{ padding:0; overflow:hidden; gap:0; } .fr{ position:relative; flex:1; min-height:120px; aspect-ratio:var(--ar, 16/9); } .fr img, .fr iframe{ position:absolute; inset:0; width:100%; height:100%; border:0; display:block; } .ttl{ position:absolute; left:12px; bottom:10px; padding:4px 10px; border-radius:999px; font-size:12.5px; font-weight:600; color:#fff; background:rgba(0,0,0,.42); -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px); } .ph{ padding:14px; }`); }
  connectedCallback() { super.connectedCallback(); clearInterval(this._ti); const r = +((this._config || {}).refresh) || 0; if (r >= 5) this._ti = setInterval(() => { this._bust = Date.now(); this.rerender(); }, r * 1000); }
  disconnectedCallback() { clearInterval(this._ti); }
  render() { const c = this._config, u = hgSafeUrl(c.url), ar = /^\d+(\.\d+)?\/\d+(\.\d+)?$/.test(String(c.ratio || '')) ? c.ratio : '16/9';
    if (!u) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Podaj adres', 'Enter an address')}</b>${hgTr('https://… lub /local/…', 'https://… or /local/…')}</div></ha-card>`;
    const src = this._bust && c.mode !== 'iframe' ? u + (u.includes('?') ? '&' : '?') + '_t=' + this._bust : u;
    return `<ha-card class="glass"><div class="fr" style="--ar:${ar}">${c.mode === 'iframe' ? `<iframe src="${H.esc(src)}" title="${H.esc(c.title || hgTr('Strona', 'Page'))}" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>` : `<img src="${H.esc(src)}" alt="${H.esc(c.title || '')}" loading="lazy" decoding="async" style="object-fit:${c.fit === 'contain' ? 'contain' : 'cover'}">`}${c.title ? `<span class="ttl">${H.esc(c.title)}</span>` : ''}</div></ha-card>`; }
  getGridOptions() { return { columns: 6, rows: 4 }; }
}
hgReg('hg-image-card', HGImageCard, hgTr('Home Glass – Obraz lub strona', 'Home Glass – Image or page'), hgTr('Zdjęcie, wykres z adresu albo strona w ramce', 'Picture, chart from a URL or a page in a frame'));

/* --- baterie --- */
class HGBatteryCard extends HGBase {
  defaults() { return { title: null, entities: [], low: 20, limit: 0 }; }
  _list() { const c = this._config, h = this._hass; return (c.entities && c.entities.length ? c.entities : hgEnts(h, ['sensor'], ['battery'])).filter((e) => h.states[e]); }
  ents() { return this._hass ? this._list() : (this._config.entities || []); }
  _extraSig() { return this._hass ? this._list().length : 0; }
  css() { return HG_G14_CSS; }
  render() { const c = this._config, h = this._hass, lo = +c.low || 20;
    const xs = this._list().map((e) => [e, H.num(h, e)]).sort((a, b) => (a[1] ?? 999) - (b[1] ?? 999)), nLo = xs.filter((x) => x[1] != null && x[1] <= lo).length, L = +c.limit > 0 ? xs.slice(0, +c.limit) : xs;
    if (!xs.length) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Brak czujników baterii', 'No battery sensors')}</b>${hgTr('Wybierz czujniki lub zostaw puste, by wykryć automatycznie', 'Pick sensors or leave empty to detect automatically')}</div></ha-card>`;
    return `<ha-card class="glass">${hgHead('mdi:battery-heart-variant', c.title || hgTr('Baterie', 'Batteries'), nLo ? hgTr(`${nLo} do wymiany`, `${nLo} low`) : hgTr('Wszystkie w porządku', 'All good'), !nLo, `<span class="cnt${nLo ? ' al' : ''}">${xs.length}</span>`)}
      <div class="ls">${L.map(([e, v]) => { const p = v == null ? 0 : Math.max(0, Math.min(100, v)), ic = v == null ? 'mdi:battery-unknown' : `mdi:battery${p >= 95 ? '' : p < 10 ? '-outline' : '-' + Math.floor(p / 10) * 10}`;
        return `<button class="li${v != null && v <= lo ? ' al' : ''}" style="all:unset;display:flex;align-items:center;gap:10px;min-height:40px;cursor:pointer" data-act="more" data-e="${H.esc(e)}">${H.icon(ic)}<span class="nm">${H.esc(H.name(h, e).replace(/\s*(bateria|battery)( level)?$/i, ''))}</span><span class="bar${p <= lo ? ' lo' : p <= 40 ? ' md' : ''}"><i style="width:${p}%"></i></span><span class="vl">${v == null ? '–' : H.fmt(v, 0) + '%'}</span></button>`; }).join('')}</div></ha-card>`; }
  onAct(a, t) { if (a === 'more') hgMore(this, t.dataset.e); }
  getGridOptions() { return { columns: 6, rows: 4 }; }
}
hgReg('hg-battery-card', HGBatteryCard, hgTr('Home Glass – Baterie', 'Home Glass – Batteries'), hgTr('Poziom baterii czujników, najsłabsze na górze', 'Sensor battery levels, weakest first'));

/* --- drzwi i okna (otwarcia) --- */
const HG_OPEN_DC = ['door', 'window', 'garage_door', 'opening'];
class HGOpeningsCard extends HGBase {
  defaults() { return { title: null, entities: [], only_open: false }; }
  _list() { const c = this._config, h = this._hass; return (c.entities && c.entities.length ? c.entities : hgEnts(h, ['binary_sensor'], HG_OPEN_DC)).filter((e) => h.states[e]); }
  ents() { return this._hass ? this._list() : (this._config.entities || []); }
  css() { return HG_G14_CSS; }
  render() { const c = this._config, h = this._hass, xs = this._list(), op = xs.filter((e) => h.states[e].state === 'on');
    if (!xs.length) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Brak czujników otwarcia', 'No opening sensors')}</b>${hgTr('Wybierz czujniki drzwi i okien', 'Pick door and window sensors')}</div></ha-card>`;
    const ic = (e, on) => { const dc = h.states[e].attributes.device_class; return dc === 'window' ? (on ? 'mdi:window-open-variant' : 'mdi:window-closed-variant') : dc === 'garage_door' ? (on ? 'mdi:garage-open' : 'mdi:garage') : (on ? 'mdi:door-open' : 'mdi:door-closed'); };
    const L = [...op, ...(c.only_open ? [] : xs.filter((e) => !op.includes(e)))];
    if (xs.length === 1) { const e = xs[0], on = op.length > 0, s = h.states[e]; return `<ha-card class="glass"><button style="all:unset;cursor:pointer;display:flex;flex-direction:column;gap:10px" data-act="more" data-e="${H.esc(e)}">${hgHead(ic(e, on), c.title || H.name(h, e), H.esc(hgAgo14(s.last_changed)), on)}<span class="big">${on ? hgTr('Otwarte', 'Open') : hgTr('Zamknięte', 'Closed')}</span></button></ha-card>`; }
    return `<ha-card class="glass">${hgHead(op.length ? 'mdi:door-open' : 'mdi:door-closed-lock', c.title || hgTr('Drzwi i okna', 'Doors and windows'), op.length ? hgTr(`Otwarte: ${op.length}`, `Open: ${op.length}`) : hgTr('Wszystko zamknięte', 'All closed'), !op.length, `<span class="cnt${op.length ? ' al' : ''}">${op.length}/${xs.length}</span>`)}
      <div class="ls">${L.length ? L.map((e) => { const on = h.states[e].state === 'on'; return `<button class="li${on ? ' al' : ''}" style="all:unset;display:flex;align-items:center;gap:10px;min-height:40px;cursor:pointer" data-act="more" data-e="${H.esc(e)}">${H.icon(ic(e, on))}<span class="nm">${H.esc(H.name(h, e))}</span><span class="vl">${on ? hgTr('otwarte', 'open') : `<span class="hide-s">${H.esc(hgAgo14(h.states[e].last_changed))}</span>`}</span></button>`; }).join('') : `<div class="ph">${hgTr('Nic nie jest otwarte', 'Nothing is open')}</div>`}</div></ha-card>`; }
  onAct(a, t) { if (a === 'more') hgMore(this, t.dataset.e); }
  getGridOptions() { return { columns: 6, rows: 4 }; }
}
hgReg('hg-openings-card', HGOpeningsCard, hgTr('Home Glass – Drzwi i okna', 'Home Glass – Doors and windows'), hgTr('Czujniki otwarcia, otwarte na górze', 'Opening sensors, open ones first'));

/* --- światło: włącz, jasność, temperatura barwy --- */
class HGLampCard extends HGBase {
  defaults() { return { entity: null, name: null, icon: null }; }
  css() { return HG_G14_CSS + U(`.pr{ display:flex; gap:6px; flex-wrap:wrap; } .pr .gb{ flex:1 1 0; min-width:0; } .lv{ font-size:13px; opacity:.7; font-variant-numeric:tabular-nums; }`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Wybierz światło', 'Choose a light')}</b>${hgTr('Dowolna encja light', 'Any light entity')}</div></ha-card>`;
    const a = s.attributes, on = s.state === 'on', dim = (a.supported_color_modes || []).some((m) => m !== 'onoff'), b = on ? (a.brightness == null ? 100 : Math.round(a.brightness / 2.55)) : 0, ct = (a.supported_color_modes || []).includes('color_temp');
    const sw = `<button class="gsw" role="switch" aria-checked="${on}" aria-label="${H.esc(c.name || H.name(h, c.entity))}" data-act="tog"><span class="gkn"></span></button>`;
    return `<ha-card class="glass">${hgHead(c.icon || a.icon || (on ? 'mdi:lightbulb-on' : 'mdi:lightbulb-outline'), c.name || H.name(h, c.entity), H.ok(s) ? (on ? (dim ? `${b}%` : hgTr('Włączone', 'On')) : hgTr('Wyłączone', 'Off')) : hgTr('niedostępne', 'unavailable'), on, sw)}
      ${dim ? `<input class="rg" type="range" min="1" max="100" value="${b || 1}" style="--v:${b}%" aria-label="${hgTr('Jasność', 'Brightness')}" data-k="b">` : ''}
      ${dim ? `<div class="pr hide-xs">${[25, 50, 100].map((p) => `<button class="gb" data-act="br" data-p="${p}" aria-pressed="${on && Math.abs(b - p) < 3}">${p}%</button>`).join('')}${ct ? `<button class="gb hide-s" data-act="ct" data-k="w" aria-label="${hgTr('Ciepłe', 'Warm')}">${H.icon('mdi:weather-sunset')}</button><button class="gb hide-s" data-act="ct" data-k="c" aria-label="${hgTr('Zimne', 'Cool')}">${H.icon('mdi:snowflake')}</button>` : ''}</div>` : ''}</ha-card>`; }
  afterRender() { const r = this.$.querySelector('input[data-k=b]'); if (!r) return; r.addEventListener('input', () => r.style.setProperty('--v', r.value + '%')); r.addEventListener('change', () => H.call(this._hass, 'light', 'turn_on', { entity_id: this._config.entity, brightness_pct: +r.value })); }
  onAct(a, t) { const e = this._config.entity, h = this._hass; if (a === 'tog') H.call(h, 'light', 'toggle', { entity_id: e });
    if (a === 'br') H.call(h, 'light', 'turn_on', { entity_id: e, brightness_pct: +t.dataset.p });
    if (a === 'ct') { const s = H.st(h, e), at = s.attributes; H.call(h, 'light', 'turn_on', { entity_id: e, color_temp_kelvin: t.dataset.k === 'w' ? (at.min_color_temp_kelvin || 2700) : (at.max_color_temp_kelvin || 6500) }); } }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-lamp-card', HGLampCard, hgTr('Home Glass – Światło', 'Home Glass – Light'), hgTr('Włącznik, jasność i barwa', 'Switch, brightness and colour temperature'));

/* --- historia: kilka czujników liczbowych na jednym wykresie --- */
const HG_HC = ['var(--hg-accent)', '#4FB3FF', '#F5B83D', '#FF6B57', '#B48CFF', '#3DD6C6'];
class HGHistoryCard extends HGBase {
  defaults() { return { title: null, entities: [], hours: 24 }; }
  ents() { return this._config.entities || []; }
  css() { return HG_G14_CSS + U(`.ch{ position:relative; flex:1; min-height:110px; } .ch svg{ position:absolute; inset:0; width:100%; height:100%; overflow:visible; } .ch path{ fill:none; stroke-width:2; vector-effect:non-scaling-stroke; stroke-linejoin:round; }
.lg{ display:flex; flex-wrap:wrap; gap:4px 12px; font-size:12px; } .lg span{ display:inline-flex; align-items:center; gap:6px; min-width:0; } .lg i{ width:10px; height:10px; border-radius:3px; flex:none; } .lg b{ font-variant-numeric:tabular-nums; } .ax{ display:flex; justify-content:space-between; font-size:11px; opacity:.55; }`); }
  async _load() { const c = this._config, h = this._hass; if (!h || !c.entities || !c.entities.length || this._ld) return; this._ld = true;
    try { const end = new Date(), st = new Date(end - (+c.hours || 24) * 3600e3), r = await h.callWS({ type: 'history/history_during_period', start_time: st.toISOString(), end_time: end.toISOString(), entity_ids: c.entities, minimal_response: true, no_attributes: true, significant_changes_only: false });
      this._hd = r || {}; } catch (e) { this._hd = this._hd || {}; } this._ht = Date.now(); this._ld = false; this.rerender(); }
  render() { const c = this._config, h = this._hass, E = (c.entities || []).filter((e) => h.states[e]);
    if (!E.length) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Wybierz czujniki', 'Choose sensors')}</b>${hgTr('Jeden lub kilka czujników liczbowych', 'One or more numeric sensors')}</div></ha-card>`;
    if (!this._ht || Date.now() - this._ht > 300e3) setTimeout(() => this._load(), 0);
    const hrs = +c.hours || 24, t1 = Date.now(), t0 = t1 - hrs * 3600e3, S = E.map((e) => ((this._hd || {})[e] || []).map((p) => [(p.lu || p.lc || 0) * 1000, parseFloat(p.s)]).filter((p) => isFinite(p[1])).concat([[t1, H.num(h, e)]]).filter((p) => p[1] != null));
    const all = S.flat(), mn = Math.min(...all.map((p) => p[1])), mx = Math.max(...all.map((p) => p[1])), rg = mx - mn || 1;
    const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${(((Math.max(p[0], t0) - t0) / (t1 - t0)) * 100).toFixed(2)},${(100 - ((p[1] - mn) / rg) * 92 - 4).toFixed(2)}`).join(' ');
    return `<ha-card class="glass">${hgHead('mdi:chart-line', c.title || hgTr('Historia', 'History'), hgTr(`Ostatnie ${hrs} h`, `Last ${hrs} h`), true)}
      <div class="ch"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="${hgTr('Wykres historii', 'History chart')}">${S.map((p, i) => (p.length > 1 ? `<path d="${path(p)}" style="stroke:${HG_HC[i % HG_HC.length]}"/>` : '')).join('')}</svg></div>
      <div class="ax hide-xs"><span>−${hrs} h</span><span>${H.fmt(mn)} – ${H.fmt(mx)}</span><span>${hgTr('teraz', 'now')}</span></div>
      <div class="lg">${E.map((e, i) => `<span><i style="background:${HG_HC[i % HG_HC.length]}"></i><span class="nm hide-s" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${H.esc(H.name(h, e))}</span><b>${H.fmt(H.num(h, e))}${H.esc(h.states[e].attributes.unit_of_measurement || '')}</b></span>`).join('')}</div></ha-card>`; }
  getGridOptions() { return { columns: 12, rows: 4 }; }
}
hgReg('hg-history-card', HGHistoryCard, hgTr('Home Glass – Historia', 'Home Glass – History'), hgTr('Kilka czujników na jednym wykresie', 'Several sensors on one chart'));

/* --- termostat --- */
class HGThermoCard extends HGBase {
  defaults() { return { entity: null, name: null }; }
  css() { return HG_G14_CSS + U(`.tc{ display:flex; align-items:center; gap:10px; justify-content:space-between; } .tc .big{ text-align:center; flex:1; } .md{ display:flex; gap:6px; flex-wrap:wrap; } .md .gb{ flex:1 1 0; min-width:0; } .cur{ font-size:13px; opacity:.7; }`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Wybierz termostat', 'Choose a thermostat')}</b>${hgTr('Encja climate lub water_heater', 'A climate or water_heater entity')}</div></ha-card>`;
    const a = s.attributes, tg = a.temperature ?? a.target_temp_low, cur = a.current_temperature, on = s.state !== 'off', u = (h.config && h.config.unit_system && h.config.unit_system.temperature) || '°C';
    const ML = { off: hgTr('Wył.', 'Off'), heat: hgTr('Grzanie', 'Heat'), cool: hgTr('Chłodzenie', 'Cool'), auto: 'Auto', heat_cool: 'Auto', dry: hgTr('Osuszanie', 'Dry'), fan_only: hgTr('Wentylator', 'Fan') };
    const MI = { off: 'mdi:power', heat: 'mdi:fire', cool: 'mdi:snowflake', auto: 'mdi:thermostat-auto', heat_cool: 'mdi:sun-snowflake-variant', dry: 'mdi:water-percent', fan_only: 'mdi:fan' };
    return `<ha-card class="glass">${hgHead('mdi:thermostat', c.name || H.name(h, c.entity), H.esc(ML[s.state] || s.state) + (cur != null ? ` · ${hgTr('teraz', 'now')} ${H.fmt(cur)}${u}` : ''), on)}
      <div class="tc"><button class="gb r" data-act="t" data-d="-1" aria-label="${hgTr('Niżej', 'Lower')}">${H.icon('mdi:minus')}</button><span class="big" aria-live="polite">${tg == null ? '–' : H.fmt(tg)}<small>${H.esc(u)}</small></span><button class="gb r" data-act="t" data-d="1" aria-label="${hgTr('Wyżej', 'Higher')}">${H.icon('mdi:plus')}</button></div>
      ${(a.hvac_modes || []).length ? `<div class="md hide-xs">${a.hvac_modes.slice(0, 5).map((m) => `<button class="gb" data-act="m" data-m="${H.esc(m)}" aria-pressed="${s.state === m}" title="${H.esc(ML[m] || m)}">${H.icon(MI[m] || 'mdi:thermostat')}<span class="hide-s">${H.esc(ML[m] || m)}</span></button>`).join('')}</div>` : ''}</ha-card>`; }
  onAct(a, t) { const c = this._config, h = this._hass, s = H.st(h, c.entity); if (!s) return; const d = hgDom(c.entity);
    if (a === 't') { const st = s.attributes.target_temp_step || (d === 'water_heater' ? 1 : 0.5), cur = s.attributes.temperature; if (cur == null) return; const v = Math.round((cur + st * +t.dataset.d) * 10) / 10; H.call(h, d, 'set_temperature', { entity_id: c.entity, temperature: v }); }
    if (a === 'm') H.call(h, d, d === 'water_heater' ? 'set_operation_mode' : 'set_hvac_mode', d === 'water_heater' ? { entity_id: c.entity, operation_mode: t.dataset.m } : { entity_id: c.entity, hvac_mode: t.dataset.m }); }
  getGridOptions() { return { columns: 6, rows: 3 }; }
}
hgReg('hg-thermo-card', HGThermoCard, hgTr('Home Glass – Termostat', 'Home Glass – Thermostat'), hgTr('Temperatura zadana i tryb', 'Target temperature and mode'));

/* --- odkurzacz --- */
class HGVacuumCard extends HGBase {
  defaults() { return { entity: null, name: null }; }
  css() { return HG_G14_CSS + U(`.ac{ display:flex; gap:6px; flex-wrap:wrap; } .ac .gb{ flex:1 1 0; min-width:0; }`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Wybierz odkurzacz', 'Choose a vacuum')}</b>${hgTr('Encja vacuum lub lawn_mower', 'A vacuum or lawn_mower entity')}</div></ha-card>`;
    const a = s.attributes, run = ['cleaning', 'mowing', 'returning'].includes(s.state), bat = a.battery_level;
    const SL = { cleaning: hgTr('Sprząta', 'Cleaning'), docked: hgTr('W stacji', 'Docked'), idle: hgTr('Bezczynny', 'Idle'), paused: hgTr('Wstrzymany', 'Paused'), returning: hgTr('Wraca do stacji', 'Returning'), error: hgTr('Błąd', 'Error'), mowing: hgTr('Kosi', 'Mowing') };
    return `<ha-card class="glass">${hgHead(hgDom(c.entity) === 'lawn_mower' ? 'mdi:robot-mower-outline' : 'mdi:robot-vacuum', c.name || H.name(h, c.entity), H.esc(SL[s.state] || H.t(h, s)) + (bat != null ? ` · ${H.fmt(bat, 0)}%` : ''), run)}
      <div class="ac">${run ? `<button class="gb" data-act="v" data-s="pause">${H.icon('mdi:pause')}<span class="hide-s">${hgTr('Pauza', 'Pause')}</span></button>` : `<button class="gb ok" data-act="v" data-s="start">${H.icon('mdi:play')}<span class="hide-s">${hgTr('Start', 'Start')}</span></button>`}<button class="gb" data-act="v" data-s="return_to_base">${H.icon('mdi:home-import-outline')}<span class="hide-s">${hgTr('Do stacji', 'Dock')}</span></button><button class="gb hide-xs" data-act="more" aria-label="${hgTr('Więcej', 'More')}">${H.icon('mdi:dots-horizontal')}</button></div></ha-card>`; }
  onAct(a, t) { const c = this._config, d = hgDom(c.entity); if (a === 'more') return hgMore(this, c.entity);
    if (a === 'v') { const sv = d === 'lawn_mower' ? { start: 'start_mowing', pause: 'pause', return_to_base: 'dock' }[t.dataset.s] : t.dataset.s; H.call(this._hass, d, sv, { entity_id: c.entity }); } }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-vacuum-card', HGVacuumCard, hgTr('Home Glass – Odkurzacz', 'Home Glass – Vacuum'), hgTr('Stan, bateria i sterowanie robotem', 'Robot state, battery and controls'));

/* --- mini odtwarzacz --- */
class HGMediaMiniCard extends HGBase {
  defaults() { return { entity: null, name: null }; }
  css() { return HG_G14_CSS + U(`ha-card.glass{ flex-direction:row; align-items:center; gap:12px; } .art{ flex:none; width:56px; height:56px; border-radius:12px; background:color-mix(in srgb, currentColor 10%, transparent) center/cover; display:grid; place-items:center; } .art ha-icon{ width:26px; height:26px; opacity:.6; }
.mt{ flex:1; min-width:0; display:flex; flex-direction:column; } .mt b{ font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .mt small{ font-size:12px; opacity:.66; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .cb{ display:flex; gap:4px; flex:none; }
@container (max-width: 240px){ .art{ width:44px; height:44px; } .cb .pv{ display:none; } }`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Wybierz odtwarzacz', 'Choose a player')}</b>${hgTr('Dowolny media_player', 'Any media_player')}</div></ha-card>`;
    const a = s.attributes, pl = s.state === 'playing', img = a.entity_picture_local || a.entity_picture;
    return `<ha-card class="glass"><span class="art" style="${img ? `background-image:url('${H.esc(img)}')` : ''}">${img ? '' : H.icon('mdi:music-note')}</span><span class="mt"><b>${H.esc(a.media_title || c.name || H.name(h, c.entity))}</b><small>${H.esc(a.media_artist || (H.ok(s) ? H.t(h, s) : hgTr('niedostępny', 'unavailable')))}</small></span>
      <span class="cb"><button class="gb r pv" data-act="m" data-s="media_previous_track" aria-label="${hgTr('Poprzedni', 'Previous')}">${H.icon('mdi:skip-previous')}</button><button class="gb r${pl ? ' ok' : ''}" data-act="m" data-s="media_play_pause" aria-label="${pl ? hgTr('Pauza', 'Pause') : hgTr('Odtwórz', 'Play')}">${H.icon(pl ? 'mdi:pause' : 'mdi:play')}</button><button class="gb r" data-act="m" data-s="media_next_track" aria-label="${hgTr('Następny', 'Next')}">${H.icon('mdi:skip-next')}</button></span></ha-card>`; }
  onAct(a, t) { if (a === 'm') H.call(this._hass, 'media_player', t.dataset.s, { entity_id: this._config.entity }); }
  getGridOptions() { return { columns: 6, rows: 1 }; }
}
hgReg('hg-media-mini-card', HGMediaMiniCard, hgTr('Home Glass – Mini odtwarzacz', 'Home Glass – Mini player'), hgTr('Okładka, tytuł i przyciski w jednym wierszu', 'Artwork, title and buttons in one row'));

/* --- duża wartość --- */
class HGValueCard extends HGBase {
  defaults() { return { entity: null, name: null, icon: null, warn: null, alert: null, decimals: 1 }; }
  css() { return HG_G14_CSS + U(`ha-card.glass{ justify-content:space-between; } .big.w{ color:#F5B83D; } .big.a{ color:#FF6B57; } .ft{ font-size:12px; opacity:.6; }`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Wybierz encję', 'Choose an entity')}</b>${hgTr('Czujnik lub dowolna encja ze stanem', 'A sensor or any entity with a state')}</div></ha-card>`;
    const v = s.state === '' ? NaN : Number(s.state), num = isFinite(v), u = s.attributes.unit_of_measurement || '', cl = num && c.alert != null && v >= +c.alert ? ' a' : num && c.warn != null && v >= +c.warn ? ' w' : '';
    return `<ha-card class="glass" data-act="more" style="cursor:pointer">${hgHead(c.icon || s.attributes.icon || 'mdi:numeric', c.name || H.name(h, c.entity), '', !cl)}<span class="big${cl}">${num ? H.fmt(v, +c.decimals || 0) : H.esc(H.t(h, s))}${num && u ? `<small>${H.esc(u)}</small>` : ''}</span><span class="ft hide-xs">${H.esc(hgAgo14(s.last_changed))}</span></ha-card>`; }
  onAct(a) { if (a === 'more') hgMore(this, this._config.entity); }
  getGridOptions() { return { columns: 3, rows: 2 }; }
}
hgReg('hg-value-card', HGValueCard, hgTr('Home Glass – Duża wartość', 'Home Glass – Big value'), hgTr('Jedna liczba z progami ostrzeżeń', 'One number with warning thresholds'));

/* --- słońce: wschód i zachód --- */
class HGSunCard extends HGBase {
  defaults() { return { entity: 'sun.sun', title: null }; }
  css() { return HG_G14_CSS + U(`.arc{ position:relative; height:70px; } .arc svg{ width:100%; height:100%; overflow:visible; } .arc .b{ fill:none; stroke:color-mix(in srgb, currentColor 18%, transparent); stroke-width:2; stroke-dasharray:4 5; } .arc .d{ fill:var(--hg-accent); }
.tt{ display:flex; justify-content:space-between; gap:8px; font-size:13px; } .tt span{ display:inline-flex; align-items:center; gap:6px; } .tt ha-icon{ width:18px; height:18px; opacity:.8; } .tt b{ font-variant-numeric:tabular-nums; }`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity || 'sun.sun');
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Brak encji sun.sun', 'No sun.sun entity')}</b>${hgTr('Włącz integrację Słońce w HA', 'Enable the Sun integration in HA')}</div></ha-card>`;
    const a = s.attributes, f = (x) => (x ? new Date(x).toLocaleTimeString(HG_LOC(), { hour: '2-digit', minute: '2-digit' }) : '–'), up = s.state === 'above_horizon';
    const r0 = Date.parse(a.next_rising), s0 = Date.parse(a.next_setting), now = Date.now(); let p = 0.5; if (up && isFinite(s0)) { const len = 12 * 3600e3; p = Math.max(0, Math.min(1, 1 - (s0 - now) / len)); }
    const x = 10 + p * 180, y = 60 - Math.sin(p * Math.PI) * 50;
    return `<ha-card class="glass">${hgHead(up ? 'mdi:white-balance-sunny' : 'mdi:weather-night', c.title || hgTr('Słońce', 'Sun'), up ? hgTr('Nad horyzontem', 'Above the horizon') : hgTr('Pod horyzontem', 'Below the horizon'), up)}
      <div class="arc hide-xs"><svg viewBox="0 0 200 70" aria-hidden="true"><path class="b" d="M10 60 Q100 -40 190 60"/>${up ? `<circle class="d" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7"/>` : ''}</svg></div>
      <div class="tt"><span>${H.icon('mdi:weather-sunset-up')}<b>${f(a.next_rising)}</b></span><span>${H.icon('mdi:weather-sunset-down')}<b>${f(a.next_setting)}</b></span></div></ha-card>`; }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-sun-card', HGSunCard, hgTr('Home Glass – Słońce', 'Home Glass – Sun'), hgTr('Wschód i zachód słońca', 'Sunrise and sunset'));

/* --- aktualizacje --- */
class HGUpdatesCard extends HGBase {
  defaults() { return { title: null }; }
  _list() { const h = this._hass; return hgEnts(h, ['update']).filter((e) => h.states[e].state === 'on'); }
  ents() { return this._hass ? this._list() : []; }
  _extraSig() { return this._hass ? this._list().join() : ''; }
  css() { return HG_G14_CSS; }
  render() { const c = this._config, h = this._hass, xs = this._list();
    return `<ha-card class="glass">${hgHead(xs.length ? 'mdi:package-up' : 'mdi:package-variant-closed-check', c.title || hgTr('Aktualizacje', 'Updates'), xs.length ? hgTr(`Dostępne: ${xs.length}`, `Available: ${xs.length}`) : hgTr('Wszystko aktualne', 'Everything up to date'), !xs.length, xs.length ? `<span class="cnt al">${xs.length}</span>` : '')}
      ${xs.length ? `<div class="ls">${xs.map((e) => { const a = h.states[e].attributes; return `<button class="li" style="all:unset;display:flex;align-items:center;gap:10px;min-height:40px;cursor:pointer" data-act="more" data-e="${H.esc(e)}">${H.icon('mdi:arrow-up-circle-outline')}<span class="nm">${H.esc(a.title || H.name(h, e))}</span><span class="vl hide-s">${H.esc(a.latest_version || '')}</span></button>`; }).join('')}</div>` : ''}</ha-card>`; }
  onAct(a, t) { if (a === 'more') hgMore(this, t.dataset.e); }
  getGridOptions() { return { columns: 6, rows: 3 }; }
}
hgReg('hg-updates-card', HGUpdatesCard, hgTr('Home Glass – Aktualizacje', 'Home Glass – Updates'), hgTr('Dostępne aktualizacje w HA', 'Available updates in HA'));
