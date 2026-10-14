/* shared/stats: Statystyki długoterminowe HA (recorder) z pamięcią podręczną, dla kart energii. */
/* ===================== statystyki (wspólne) ===================== */
const HGStats = {
  cache: {},
  async daily(hass, ids, days) {
    const key = ids.join(',') + days;
    const now = Date.now(), c = this.cache[key];
    if (c && now - c.t < 5 * 60 * 1000) return c.v;
    if (this.inflight && this.inflight[key]) return this.inflight[key];
    (this.inflight = this.inflight || {})[key] = this._fetch(hass, ids, days, key, now).finally(() => { delete this.inflight[key]; });
    return this.inflight[key];
  },
  /* granice dni w strefie HA (Europe/Warsaw), niezależnie od strefy przeglądarki */
  tz(hass) { return (hass && hass.config && hass.config.time_zone) || Intl.DateTimeFormat().resolvedOptions().timeZone; },
  key(d, tz) { return new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); },
  midnight(ms, tz) {   // północ w strefie tz dla dnia zawierającego ms
    const k = this.key(new Date(ms), tz), [y, m, d] = k.split('-').map(Number);
    let t = Date.UTC(y, m - 1, d);
    for (let i = 0; i < 3; i++) { const off = this.offset(t, tz); t = Date.UTC(y, m - 1, d) - off; }
    return t;
  },
  offset(ms, tz) { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000; },
  async _fetch(hass, ids, days, key, now) {
    const tz = this.tz(hass);
    const t0 = this.midnight(Date.now(), tz);
    const dayStarts = [...Array(days)].map((_, i) => this.midnight(t0 - (days - 1 - i) * 86400000 + 43200000, tz));
    const start = new Date(dayStarts[0]);
    const r = await hass.callWS({ type: 'recorder/statistics_during_period', start_time: start.toISOString(), statistic_ids: ids, period: 'day', types: ['change'], units: { energy: 'kWh' } });
    const out = {};
    for (const id of ids) {
      const m = {};
      for (const row of r[id] || []) { const d = new Date(typeof row.start === 'number' ? row.start : Date.parse(row.start)); m[this.key(d, tz)] = row.change || 0; }
      out[id] = m;
    }
    // dni jako Date w południe danego dnia (getDay/getDate poprawne także poza strefą HA); klucz = data w strefie HA
    const dd = dayStarts.map((t) => { const k = this.key(new Date(t + 43200000), tz), [y, mo, da] = k.split('-').map(Number); const d = new Date(y, mo - 1, da, 12); d.__k = k; return d; });
    const v = { days: dd, keys: dd.map((d) => d.__k), byId: out, has: ids.some((id) => (r[id] || []).length), present: Object.fromEntries(ids.map((id) => [id, new Set((r[id] || []).map((row) => this.key(new Date(typeof row.start === 'number' ? row.start : Date.parse(row.start)), tz)))])) };
    this.cache[key] = { t: now, v };
    return v;
  },
};
