/* shared/calendar: Kalendarze HA: pobieranie wydarzeń, kolory, formatowanie godzin i dni. */
/* ===================== MAPA + KALENDARZ ===================== */
const HG_PAL = ['#F9C80E', '#F0955A', '#B793EC', '#5AC8FA', '#34C759', '#FF6B8B', '#8E9AAF'];
const hgTime = (d) => d.toLocaleTimeString(HG_LOC(), { hour: '2-digit', minute: '2-digit' });
const hgDayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* --- kalendarze: wspólne pobieranie (REST /api/calendars, tylko odczyt) --- */
const HGCal = {
  cache: {},
  parse(e, cal) {
    const ad = !!(e.start && e.start.date && !e.start.dateTime);
    const s = ad ? new Date(e.start.date + 'T00:00:00') : new Date(e.start.dateTime || e.start);
    const en = ad ? new Date((e.end && e.end.date ? e.end.date : e.start.date) + 'T00:00:00') : new Date((e.end && (e.end.dateTime || e.end)) || s);
    return { title: e.summary || hgTr('(bez tytułu)', '(untitled)'), start: s, end: en, allDay: ad, loc: e.location || '', cal };
  },
  async fetch(hass, cals, start, end) {
    const key = cals.map((c) => c.entity).join(',') + start.toISOString() + end.toISOString();
    const hit = this.cache[key]; if (hit && Date.now() - hit.t < 300000) return hit.p;
    const p = Promise.all(cals.map(async (c) => {
      const s = H.st(hass, c.entity);
      if (!s || s.state === 'unavailable') return { cal: c, err: hgTr('niedostępny', 'unavailable'), ev: [] };
      try { const r = await hass.callApi('GET', `calendars/${c.entity}?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`);
        return { cal: c, ev: r.map((e) => this.parse(e, c)) }; } catch (e) { return { cal: c, err: hgTr('błąd pobierania', 'fetch error'), ev: [] }; }
    }));
    this.cache[key] = { t: Date.now(), p }; return p;
  },
  cals(hass, list) {
    return (list || []).map((c, i) => { const o = typeof c === 'string' ? { entity: c } : Object.assign({}, c);
      o.color = o.color || HG_PAL[i % HG_PAL.length]; const s = H.st(hass, o.entity); o.name = o.name || (s ? s.attributes.friendly_name : o.entity); return o; });
  },
};
