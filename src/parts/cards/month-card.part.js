const HG_MONTHS = () => hgTr(['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'],
  ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);

/* --- mini-kalendarz miesiąca --- */
class HGMonthCard extends HGBase {
  defaults() { return { title: hgTr('Kalendarz', 'Calendar'), icon: 'mdi:calendar-blank-outline', calendars: [] }; }
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
    if (this._k !== k) return; this._res = res; this._rk = k; this._n = (this._n || 0) + 1; this.rerender();
    clearTimeout(this._rt); this._rt = setTimeout(() => { this._k = null; this.rerender(); }, 300000);   // odświeżanie co 5 min (jak agenda)
  }
  disconnectedCallback() { clearTimeout(this._rt); this._k = null; this._stale = true; }
  render() {
    const c = this._config, now = new Date(), base = new Date(now.getFullYear(), now.getMonth() + (this._off || 0), 1);
    const y = base.getFullYear(), m = base.getMonth();
    this._load(y, m);
    const res = this._rk === `${y}-${m}` ? this._res : null;
    const byDay = {};
    for (const r of res || []) for (const e of r.ev) {
      const d = new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate());
      const last = e.allDay || e.end > e.start ? new Date(e.end - 1) : e.end;   // koniec wyłączny: wydarzenie do 00:00 nie zajmuje następnego dnia
      for (let i = 0; i < 62 && d <= last; i++) { (byDay[hgDayKey(d)] = byDay[hgDayKey(d)] || []).push(e); d.setDate(d.getDate() + 1); }
    }
    const first = (base.getDay() + 6) % 7, start = new Date(y, m, 1 - first);
    let cells = hgTr(['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'], ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((d) => `<div class="wd">${d}</div>`).join('');
    const today = hgDayKey(now), sel = this._sel || today;
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i); const k = hgDayKey(d), ev = byDay[k] || [];
      const cols = [...new Set(ev.map((e) => e.cal.color))].slice(0, 3);
      cells += `<button class="d ${d.getMonth() !== m ? 'o' : ''} ${k === today ? 't' : ''} ${k === sel ? 's' : ''}" data-act="day" data-k="${k}" aria-label="${d.toLocaleDateString(HG_LOC(), { day: 'numeric', month: 'long' })}${ev.length ? hgTr(`, wydarzenia: ${ev.length}`, `, events: ${ev.length}`) : ''}">
        <span>${d.getDate()}</span><div class="ds">${cols.map((cl) => `<i style="background:${cl}"></i>`).join('')}</div></button>`;
    }
    const leg = (res || HGCal.cals(this._hass, c.calendars).map((cal) => ({ cal }))).map((r) => `<span class="${r.err ? 'x' : ''}" title="${H.esc(r.cal.entity)}${r.err ? ' – ' + r.err : ''}"><i style="background:${r.err ? '#C9CCD0' : r.cal.color}"></i>${H.esc(r.cal.name)}</span>`).join('');
    const sd = new Date(sel + 'T00:00:00'), sev = (byDay[sel] || []).slice().sort((a, b) => a.start - b.start);
    const inMonth = sd.getMonth() === m && sd.getFullYear() === y;
    const dl = inMonth ? `<div class="dl"><h4>${H.esc(sd.toLocaleDateString(HG_LOC(), { weekday: 'long', day: 'numeric', month: 'long' }))}</h4>
      ${sev.length ? sev.map((e) => `<div class="ev"><i style="background:${e.cal.color}"></i><small>${e.allDay ? hgTr('cały dzień', 'all day') : hgTime(e.start)}</small><span>${H.esc(e.title)}</span></div>`).join('') : `<div class="none">${res ? hgTr('Brak wydarzeń', 'No events') : hgTr('Wczytywanie…', 'Loading…')}</div>`}</div>` : '';
    if (!c.calendars.length) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Brak kalendarzy', 'No calendars')}</b>${hgTr('Dodaj integrację kalendarza w Home Assistant.', 'Add a calendar integration in Home Assistant.')}</div></ha-card>`;
    return `<ha-card class="glass"><div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><span class="sp"></span>
        <button class="ib" data-act="open" aria-label="${hgTr('Otwórz kalendarz HA', 'Open HA calendar')}" title="${hgTr('Otwórz kalendarz Home Assistant', 'Open Home Assistant calendar')}">${H.icon('mdi:arrow-expand')}</button></div>
      <div class="mh"><b>${HG_MONTHS()[m]} ${y}</b><button class="ib" data-act="prev" aria-label="${hgTr('Poprzedni miesiąc', 'Previous month')}" title="${hgTr('Poprzedni miesiąc', 'Previous month')}">${H.icon('mdi:chevron-left')}</button>
        <button class="ib" data-act="today" aria-label="${hgTr('Dziś', 'Today')}" title="${hgTr('Dziś', 'Today')}">${H.icon('mdi:calendar-today-outline')}</button>
        <button class="ib" data-act="next" aria-label="${hgTr('Następny miesiąc', 'Next month')}" title="${hgTr('Następny miesiąc', 'Next month')}">${H.icon('mdi:chevron-right')}</button></div>
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
