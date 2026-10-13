/* ===================== MAPA + KALENDARZ ===================== */
const HG_PAL = ['#F9C80E', '#F0955A', '#B793EC', '#5AC8FA', '#34C759', '#FF6B8B', '#8E9AAF'];
const hgRel = (d) => {
  const m = Math.max(0, Math.round((Date.now() - d) / 60000));
  if (m < 1) return 'przed chwilą'; if (m < 60) return `${m} min temu`;
  const h = Math.round(m / 60); if (h < 24) return `${h} godz. temu`;
  const dd = Math.round(h / 24); return dd === 1 ? 'wczoraj' : `${dd} dni temu`;
};
const hgTime = (d) => d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
const hgDayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hgZoneName = (hass, st) => {
  if (st === 'home') return (H.st(hass, 'zone.home') || { attributes: {} }).attributes.friendly_name || 'W domu';
  if (st === 'not_home') return 'Poza strefami'; if (st === 'unknown' || st === 'unavailable') return 'Nieznana lokalizacja'; return st;
};

/* --- mapa: natywna karta HA w szklanym kontenerze --- */
class HGMapCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  setConfig(c) {
    this._config = Object.assign({ title: 'Mapa', icon: 'mdi:map-outline', entities: [], theme_mode: 'dark', hours_to_show: 0 }, c);
    const sr = this.shadowRoot;
    sr.innerHTML = `<style>${HG_BASE}${U(`
ha-card.glass{ display:flex; flex-direction:column; padding:var(--s2) var(--s2) var(--s2); gap:var(--s2); }
.hd{ padding:0 2u; }
.mw{ position:relative; flex:1; min-height:220u; border-radius:var(--r-sm); overflow:hidden; background:#e9e5df;
  --ha-card-border-radius: 0; --ha-card-box-shadow: none; --ha-card-border-width: 0; }
.mw > *{ position:absolute; inset:0; display:block; height:100%; }
`)}</style><ha-card class="glass"><div class="hd">${H.icon(this._config.icon, 'ic')}<span class="tt">${H.esc(this._config.title)}</span><span class="sp"></span><span class="note">${this._config.entities.filter((e) => String(e).startsWith('person.')).length} os. · ${this._config.entities.filter((e) => String(e).startsWith('zone.')).length} strefy</span></div><div class="mw"></div></ha-card>`;
    this._mw = sr.querySelector('.mw');
    this._make();
  }
  async _make() {
    const c = this._config;
    // theme_mode: auto -> jasna/ciemna mapa razem ze schematem dashboardu (HGTheme), przełączana na żywo
    const tm = c.theme_mode === 'auto' ? (typeof HGTheme !== 'undefined' && HGTheme.dark ? 'dark' : 'light') : c.theme_mode;
    this._tm = tm;
    if (this._map) { this._map.remove(); this._map = null; }
    const conf = { type: 'map', entities: c.entities.map((e) => (typeof e === 'string' ? { entity: e } : e)), theme_mode: tm, hours_to_show: c.hours_to_show, fit_zones: true };
    const mk = this._mk = (this._mk || 0) + 1;
    const helpers = window.loadCardHelpers ? await window.loadCardHelpers() : null;
    if (mk !== this._mk) return;
    let el;
    try { el = helpers.createCardElement(conf); } catch (e) { this._mw.innerHTML = `<div class="ph"><b>Mapa niedostępna</b>${H.esc(e.message)}</div>`; return; }
    el.layout = 'grid'; el.setAttribute('layout', 'grid');
    this._map = el; if (this._hass) el.hass = this._hass;
    this._mw.appendChild(el);
    // wewnętrzna karta mapy ma własny współczynnik proporcji – wymuszamy wypełnienie kontenera
    const fix = () => {
      const r = el.shadowRoot; if (!r) return false;
      if (!r.getElementById('hg-fill')) { const s = document.createElement('style'); s.id = 'hg-fill';
        s.textContent = 'ha-card{height:100%!important;border-radius:0!important;border:0!important;box-shadow:none!important} #root{height:100%!important;padding-bottom:0!important} ha-map{position:absolute;inset:0;height:100%!important}';
        r.appendChild(s); }
      return true;
    };
    let n = 0; const t = setInterval(() => { if (fix() || ++n > 40) clearInterval(t); }, 150);
  }
  set hass(h) { this._hass = h; if (this._map) this._map.hass = h; }
  get hass() { return this._hass; }
  connectedCallback() {
    this._onScheme = this._onScheme || (() => { if (this._config && this._config.theme_mode === 'auto' && this._tm !== (HGTheme.dark ? 'dark' : 'light')) this._make(); });
    window.addEventListener('hg-scheme', this._onScheme); this._onScheme();
  }
  disconnectedCallback() { window.removeEventListener('hg-scheme', this._onScheme); }
  getCardSize() { return 6; }
  getGridOptions() { return { columns: 12, rows: 6 }; }
}
hgReg('hg-map-card', HGMapCard, 'Home Glass – Mapa', 'Natywna mapa HA w szklanej ramce');

/* --- lista osób + strefy --- */
class HGPeopleCard extends HGBase {
  defaults() { return { title: 'Domownicy', icon: 'mdi:account-group-outline', persons: [], zones: [] }; }
  ents() { return this._config.persons.concat(this._config.zones); }
  _extraSig() { return Math.floor(Date.now() / 60000); }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; gap:var(--s1); overflow:auto; padding:var(--s3) var(--s3); }
.lst{ display:flex; flex-direction:column; gap:2u; margin-top:4u; }
.p{ display:flex; align-items:center; gap:var(--s2); padding:var(--s1) var(--s1); margin:0 -8u; border-radius:var(--r-sm); text-align:left; width:calc(100% + 16u); min-height:max(calc(var(--k) * 50), var(--hg-tgt, 0px)); }
.p:hover{ background:rgba(255,255,255,.45); }
.p .av{ width:34u; height:34u; border-radius:var(--r-sm); background:center/cover #9aa3ad; flex:none; display:flex; align-items:center; justify-content:center; color:#fff; font-size:var(--fs-md); font-weight:400;
  box-shadow: 0 0 0 2u rgba(255,255,255,.85); }
.p.home .av{ box-shadow: 0 0 0 2u var(--hg-accent); }
.p .tx{ min-width:0; flex:1; display:flex; flex-direction:column; gap:3u; }
.p b{ display:block; font-size:var(--fs-md); font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.p span{ display:block; font-size:var(--fs-sm); color:#5A5E64; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.p span ha-icon{ width:10u; height:10u; vertical-align:-1u; margin-right:3u; }
.p span em{ font-style:normal; color:#8A8E94; }
.sec{ font-size:var(--fs-xs); color:#6A6E74; margin-top:8u; text-transform:uppercase; letter-spacing:.06em; }
.zs{ display:flex; flex-wrap:wrap; gap:5u; }
.z{ display:inline-flex; align-items:center; gap:4u; padding:0 var(--s1); height:max(calc(var(--k) * 24), var(--hg-tgt, 0px)); border-radius:var(--r-sm); background:rgba(255,255,255,.7); font-size:var(--fs-sm); }
.z i{ font-style:normal; min-width:14u; height:14u; border-radius:var(--r-sm); background:#E4E5E7; display:inline-flex; align-items:center; justify-content:center; font-size:var(--fs-xs); }
.z.has i{ background:var(--hg-accent); color:var(--hg-on-accent); }
`);
  }
  render() {
    const c = this._config, h = this._hass;
    const rows = c.persons.map((e) => {
      const s = H.st(h, e); if (!s) return '';
      const home = s.state === 'home', since = new Date(s.last_changed);
      return `<button class="p lr ${home ? 'home' : ''}" data-act="more" data-e="${e}" title="${H.esc(s.attributes.friendly_name)} – szczegóły">${hgAvatar(h, e, 'av')}
        <div class="tx"><b>${H.esc(s.attributes.friendly_name)}</b><span title="Ostatnia zmiana: ${H.esc(since.toLocaleString('pl-PL'))}">${H.icon(home ? 'mdi:home-outline' : s.state === 'not_home' ? 'mdi:map-marker-outline' : 'mdi:map-marker-radius-outline')}${H.esc(hgZoneName(h, s.state))} <em>· ${hgRel(since)}</em></span></div></button>`;
    }).join('');
    const zs = c.zones.map((z) => { const s = H.st(h, z); if (!s) return ''; const n = Number(s.state) || 0;
      return `<button class="z ${n ? 'has' : ''}" data-act="more" data-e="${z}" title="${H.esc(s.attributes.friendly_name)}: ${n} os.">${H.esc(s.attributes.friendly_name)}<i>${n}</i></button>`; }).join('');
    return `<ha-card class="glass"><div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span></div>
      <div class="lst">${rows}</div>${zs ? `<div class="sec">Strefy</div><div class="zs">${zs}</div>` : ''}</ha-card>`;
  }
  onAct(a, el) { if (a === 'more') H.fire(this, 'hass-more-info', { entityId: el.dataset.e }); }
}
hgReg('hg-people-card', HGPeopleCard, 'Home Glass – Domownicy', 'Lista osób z awatarem, strefą i czasem zmiany');

/* --- kalendarze: wspólne pobieranie (REST /api/calendars, tylko odczyt) --- */
const HGCal = {
  cache: {},
  parse(e, cal) {
    const ad = !!(e.start && e.start.date && !e.start.dateTime);
    const s = ad ? new Date(e.start.date + 'T00:00:00') : new Date(e.start.dateTime || e.start);
    const en = ad ? new Date((e.end && e.end.date ? e.end.date : e.start.date) + 'T00:00:00') : new Date((e.end && (e.end.dateTime || e.end)) || s);
    return { title: e.summary || '(bez tytułu)', start: s, end: en, allDay: ad, loc: e.location || '', cal };
  },
  async fetch(hass, cals, start, end) {
    const key = cals.map((c) => c.entity).join(',') + start.toISOString() + end.toISOString();
    const hit = this.cache[key]; if (hit && Date.now() - hit.t < 300000) return hit.p;
    const p = Promise.all(cals.map(async (c) => {
      const s = H.st(hass, c.entity);
      if (!s || s.state === 'unavailable') return { cal: c, err: 'niedostępny', ev: [] };
      try { const r = await hass.callApi('GET', `calendars/${c.entity}?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`);
        return { cal: c, ev: r.map((e) => this.parse(e, c)) }; } catch (e) { return { cal: c, err: 'błąd pobierania', ev: [] }; }
    }));
    this.cache[key] = { t: Date.now(), p }; return p;
  },
  cals(hass, list) {
    return (list || []).map((c, i) => { const o = typeof c === 'string' ? { entity: c } : Object.assign({}, c);
      o.color = o.color || HG_PAL[i % HG_PAL.length]; const s = H.st(hass, o.entity); o.name = o.name || (s ? s.attributes.friendly_name : o.entity); return o; });
  },
};
const HG_MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

/* --- mini-kalendarz miesiąca --- */
class HGMonthCard extends HGBase {
  defaults() { return { title: 'Kalendarz', icon: 'mdi:calendar-blank-outline', calendars: [] }; }
  ents() { return this._config.calendars.map((c) => (typeof c === 'string' ? c : c.entity)); }
  _extraSig() { return [this._off || 0, this._sel || '', this._n || 0, hgDayKey(new Date())]; }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; gap:var(--s1); overflow:auto; }
.mh{ display:flex; align-items:center; gap:4u; margin-top:2u; }
.mh b{ font-size:calc(15u * var(--hg-fsv, 1)); font-weight:400; flex:1; }
.g{ display:grid; grid-template-columns:repeat(7,1fr); gap:2u; text-align:center; }
.wd{ font-size:var(--fs-xs); color:#6A6E74; padding:2u 0 4u; }
.d{ position:relative; height:max(calc(var(--k) * 30), var(--hg-tgt, 0px)); border-radius:var(--r-sm); font-size:var(--fs-sm); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2u; }
.d:hover{ background:rgba(255,255,255,.5); }
.d.o{ color:#A4A8AE; }
.d.t span{ background:#F9D13A; color:#1E2023; border-radius:50%; width:20u; height:20u; display:inline-flex; align-items:center; justify-content:center; }
.d.s{ background:rgba(255,255,255,.85); }
.d .ds{ display:flex; gap:2u; height:4u; } .d .ds i{ width:4u; height:4u; border-radius:50%; }
.leg{ display:flex; flex-wrap:wrap; gap:4u 10u; font-size:var(--fs-xs); color:#4D5157; margin-top:2u; }
.leg span{ display:inline-flex; align-items:center; gap:4u; } .leg i{ width:7u; height:7u; border-radius:50%; }
.leg .x{ color:#A4A8AE; }
.dl{ border-top:1px solid rgba(0,0,0,.06); padding-top:8u; display:flex; flex-direction:column; gap:5u; }
.dl h4{ margin:0; font-size:var(--fs-sm); font-weight:400; }
.ev{ display:flex; gap:var(--s1); align-items:center; font-size:var(--fs-sm); } .ev i{ width:3u; align-self:stretch; border-radius:2u; } .ev small{ color:#6A6E74; font-size:var(--fs-xs); min-width:52u; }
.none{ font-size:var(--fs-sm); color:#8A8E94; }
`);
  }
  async _load(y, m) {
    const k = `${y}-${m}`; if (this._k === k) return; this._k = k;
    const cals = HGCal.cals(this._hass, this._config.calendars);
    const res = await HGCal.fetch(this._hass, cals, new Date(y, m, 1), new Date(y, m + 1, 1));
    if (this._k !== k) return; this._res = res; this._n = (this._n || 0) + 1; this.rerender();
  }
  render() {
    const c = this._config, now = new Date(), base = new Date(now.getFullYear(), now.getMonth() + (this._off || 0), 1);
    const y = base.getFullYear(), m = base.getMonth();
    this._load(y, m);
    const res = this._k === `${y}-${m}` ? this._res : null;
    const byDay = {};
    for (const r of res || []) for (const e of r.ev) {
      const d = new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate());
      const last = e.allDay ? new Date(e.end - 1) : e.end;
      for (let i = 0; i < 62 && d <= last; i++) { (byDay[hgDayKey(d)] = byDay[hgDayKey(d)] || []).push(e); d.setDate(d.getDate() + 1); }
    }
    const first = (base.getDay() + 6) % 7, start = new Date(y, m, 1 - first);
    let cells = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map((d) => `<div class="wd">${d}</div>`).join('');
    const today = hgDayKey(now), sel = this._sel || today;
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i); const k = hgDayKey(d), ev = byDay[k] || [];
      const cols = [...new Set(ev.map((e) => e.cal.color))].slice(0, 3);
      cells += `<button class="d ${d.getMonth() !== m ? 'o' : ''} ${k === today ? 't' : ''} ${k === sel ? 's' : ''}" data-act="day" data-k="${k}" aria-label="${d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}${ev.length ? `, wydarzenia: ${ev.length}` : ''}">
        <span>${d.getDate()}</span><div class="ds">${cols.map((cl) => `<i style="background:${cl}"></i>`).join('')}</div></button>`;
    }
    const leg = (res || HGCal.cals(this._hass, c.calendars).map((cal) => ({ cal }))).map((r) => `<span class="${r.err ? 'x' : ''}" title="${H.esc(r.cal.entity)}${r.err ? ' – ' + r.err : ''}"><i style="background:${r.err ? '#C9CCD0' : r.cal.color}"></i>${H.esc(r.cal.name)}</span>`).join('');
    const sd = new Date(sel + 'T00:00:00'), sev = (byDay[sel] || []).slice().sort((a, b) => a.start - b.start);
    const inMonth = sd.getMonth() === m && sd.getFullYear() === y;
    const dl = inMonth ? `<div class="dl"><h4>${H.esc(sd.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }))}</h4>
      ${sev.length ? sev.map((e) => `<div class="ev"><i style="background:${e.cal.color}"></i><small>${e.allDay ? 'cały dzień' : hgTime(e.start)}</small><span>${H.esc(e.title)}</span></div>`).join('') : `<div class="none">${res ? 'Brak wydarzeń' : 'Wczytywanie…'}</div>`}</div>` : '';
    if (!c.calendars.length) return `<ha-card class="glass"><div class="ph"><b>Brak kalendarzy</b>Dodaj integrację kalendarza w Home Assistant.</div></ha-card>`;
    return `<ha-card class="glass"><div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><span class="sp"></span>
        <button class="ib" data-act="open" aria-label="Otwórz kalendarz HA" title="Otwórz kalendarz Home Assistant">${H.icon('mdi:arrow-expand')}</button></div>
      <div class="mh"><b>${HG_MONTHS[m]} ${y}</b><button class="ib" data-act="prev" aria-label="Poprzedni miesiąc" title="Poprzedni miesiąc">${H.icon('mdi:chevron-left')}</button>
        <button class="ib" data-act="today" aria-label="Dziś" title="Dziś">${H.icon('mdi:calendar-today-outline')}</button>
        <button class="ib" data-act="next" aria-label="Następny miesiąc" title="Następny miesiąc">${H.icon('mdi:chevron-right')}</button></div>
      <div class="g">${cells}</div><div class="leg">${leg}</div>${dl}</ha-card>`;
  }
  onAct(a, el) {
    if (a === 'prev') this._off = (this._off || 0) - 1; else if (a === 'next') this._off = (this._off || 0) + 1;
    else if (a === 'today') { this._off = 0; this._sel = null; } else if (a === 'day') this._sel = el.dataset.k;
    else if (a === 'open') return H.navigate('/calendar');
    this.rerender();
  }
}
hgReg('hg-month-card', HGMonthCard, 'Home Glass – Miesiąc', 'Mini-kalendarz miesiąca z kropkami wydarzeń');

/* --- agenda: najbliższe wydarzenia pogrupowane po dniach --- */
class HGAgendaCard extends HGBase {
  defaults() { return { title: 'Nadchodzące', icon: 'mdi:format-list-bulleted', calendars: [], days: 60 }; }
  ents() { return this._config.calendars.map((c) => (typeof c === 'string' ? c : c.entity)); }
  _extraSig() { return [this._n || 0, hgDayKey(new Date())]; }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; gap:var(--s1); overflow:auto; }
.day{ margin-top:8u; } .day h4{ margin:0 0 5u; font-size:10px; font-size:var(--fs-sm); font-weight:400; color:#4D5157; text-transform:none; }
.day h4 em{ font-style:normal; color:#1E2023; margin-right:4u; }
.ev{ gap:var(--s2); }
.ev i{ width:4u; align-self:stretch; border-radius:2u; flex:none; }
.ev .tm{ font-size:var(--fs-sm); color:#5A5E64; min-width:58u; }
.ev .tx{ min-width:0; flex:1; } .ev b{ display:block; font-size:var(--fs-sm); font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ev small{ display:block; font-size:var(--fs-xs); color:#8A8E94; margin-top:1u; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.none{ margin-top:10u; font-size:var(--fs-sm); color:#6A6E74; }
`);
  }
  async _load() {
    const k = hgDayKey(new Date()); if (this._k === k) return; this._k = k;
    const t0 = new Date(); t0.setHours(0, 0, 0, 0); const t1 = new Date(t0); t1.setDate(t1.getDate() + this._config.days);
    this._res = await HGCal.fetch(this._hass, HGCal.cals(this._hass, this._config.calendars), t0, t1); this._n = (this._n || 0) + 1; this.rerender();
    clearTimeout(this._rt); this._rt = setTimeout(() => { this._k = null; this.rerender(); }, 300000);
  }
  render() {
    const c = this._config;
    if (!c.calendars.length) return `<ha-card class="glass"><div class="ph"><b>Brak kalendarzy</b>Nie znaleziono encji calendar.*</div></ha-card>`;
    this._load();
    const hd = `<div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><small class="note" style="margin-left:4u">${c.days} dni</small></div>`;
    if (!this._res) return `<ha-card class="glass">${hd}<div class="none">Wczytywanie…</div></ha-card>`;
    const now = new Date(), t0 = new Date(now); t0.setHours(0, 0, 0, 0);
    const ev = this._res.flatMap((r) => r.ev).filter((e) => (e.allDay ? e.end > t0 : e.end >= now)).sort((a, b) => a.start - b.start);
    const groups = {};
    for (const e of ev) { const d = e.start < t0 ? t0 : e.start; (groups[hgDayKey(d)] = groups[hgDayKey(d)] || []).push(e); }
    const tom = new Date(t0); tom.setDate(tom.getDate() + 1);
    const lbl = (k) => { const d = new Date(k + 'T00:00:00'); const pre = k === hgDayKey(t0) ? 'Dziś' : k === hgDayKey(tom) ? 'Jutro' : '';
      return `${pre ? `<em>${pre}</em>` : ''}${H.esc(d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }))}`; };
    const body = Object.keys(groups).map((k) => `<div class="day"><h4>${lbl(k)}</h4>${groups[k].map((e) => `<div class="ev lr" title="${H.esc(e.cal.name)}"><i style="background:${e.cal.color}"></i>
      <span class="tm">${e.allDay ? 'cały dzień' : `${hgTime(e.start)}–${hgTime(e.end)}`}</span><div class="tx"><b>${H.esc(e.title)}</b><small>${H.esc(e.cal.name)}${e.loc ? ' · ' + H.esc(e.loc) : ''}</small></div></div>`).join('')}</div>`).join('');
    const errs = this._res.filter((r) => r.err).map((r) => r.cal.name);
    return `<ha-card class="glass">${hd}${body || `<div class="none">Brak wydarzeń w najbliższych ${c.days} dniach.</div>`}
      ${errs.length ? `<div class="note" style="margin-top:8u">Niedostępne: ${H.esc(errs.join(', '))}</div>` : ''}</ha-card>`;
  }
}
hgReg('hg-agenda-card', HGAgendaCard, 'Home Glass – Agenda', 'Nadchodzące wydarzenia pogrupowane po dniach');
