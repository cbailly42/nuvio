/* shared/weather: Pogoda: nazwy warunków i subskrypcja prognozy (karta pogody i wygaszacz). */
/* ===================== POGODA NA ZEWNĄTRZ ===================== */
/* Źródło: weather.<x> (stan + atrybuty), prognoza godzinowa i dzienna przez WS weather/subscribe_forecast (jedna subskrypcja na typ,
   współdzielona przez wszystkie instancje karty), temperatura „teraz” z fizycznego czujnika zewnętrznego (CFG temp_sensor), słońce z sun.sun.
   Ikony: Meteocons (basmilius/weather-icons, MIT) hostowane lokalnie; animowana tylko duża ikona, w lite / reduced-motion wersja statyczna. */
const HG_WX_COND = {
  'clear-night': ['Bezchmurnie', 'clear-night', 'clear-night'], sunny: ['Słonecznie', 'clear-day', 'clear-night'], partlycloudy: ['Częściowe zachmurzenie', 'partly-cloudy-day', 'partly-cloudy-night'],
  cloudy: ['Pochmurno', 'cloudy', 'cloudy'], fog: ['Mgła', 'fog-day', 'fog-night'], rainy: ['Deszcz', 'rain', 'rain'], pouring: ['Ulewa', 'extreme-rain', 'extreme-rain'],
  snowy: ['Śnieg', 'snow', 'snow'], 'snowy-rainy': ['Deszcz ze śniegiem', 'sleet', 'sleet'], hail: ['Grad', 'hail', 'hail'], lightning: ['Burza', 'thunderstorms', 'thunderstorms'],
  'lightning-rainy': ['Burza z deszczem', 'thunderstorms-rain', 'thunderstorms-rain'], windy: ['Wietrznie', 'wind', 'wind'], 'windy-variant': ['Wietrznie, pochmurno', 'wind', 'wind'],
  exceptional: ['Zjawisko wyjątkowe', 'not-available', 'not-available'],
};
/* etykiety EN (HG_WX_COND[x][0] to PL); wybór przy użyciu: HGWx.cn() */
const HG_WX_COND_EN = { 'clear-night': 'Clear', sunny: 'Sunny', partlycloudy: 'Partly cloudy', cloudy: 'Cloudy', fog: 'Fog', rainy: 'Rain', pouring: 'Pouring', snowy: 'Snow', 'snowy-rainy': 'Sleet', hail: 'Hail',
  lightning: 'Thunderstorm', 'lightning-rainy': 'Thunderstorm, rain', windy: 'Windy', 'windy-variant': 'Windy, cloudy', exceptional: 'Exceptional' };
const HGWx = {
  subs: new Map(),   // key entity|type -> { data, cbs:Set, unsub, pending }
  sub(hass, entity, type, cb) {
    const k = entity + '|' + type; let s = this.subs.get(k);
    if (!s) {
      s = { data: null, cbs: new Set(), unsub: null };
      this.subs.set(k, s);
      try {
        s.pending = hass.connection.subscribeMessage((m) => { s.data = (m && m.forecast) || []; for (const f of s.cbs) f(s.data); }, { type: 'weather/subscribe_forecast', forecast_type: type, entity_id: entity });
        s.pending.then((u) => { s.unsub = u; if (!s.cbs.size) { u(); this.subs.delete(k); } }, () => { this.subs.delete(k); });
      } catch (e) { this.subs.delete(k); }
    }
    s.cbs.add(cb); if (s.data) cb(s.data);
    return () => { s.cbs.delete(cb); if (!s.cbs.size && s.unsub) { s.unsub(); this.subs.delete(k); } };
  },
  cn: (k) => (HG_WX_COND[k] ? hgTr(HG_WX_COND[k][0], HG_WX_COND_EN[k]) : k),
  still: () => (typeof hgLite === 'function' && hgLite()) || HGPerf.eco() || matchMedia('(prefers-reduced-motion: reduce)').matches,
  icon(cfg, cond, night, anim) {
    const d = HG_WX_COND[cond] || HG_WX_COND.exceptional, f = night ? d[2] : d[1];
    return `${cfg.icon_base}${anim && !this.still() ? '' : 'static-'}${f}.svg?v=${cfg.icon_v}`;
  },
  // kolor temperatury: zimno (niebieski) -> ciepło (pomarańcz)
  tcol(t) {
    const st = [[-10, [76, 130, 230]], [0, [90, 170, 235]], [10, [96, 196, 160]], [18, [245, 196, 70]], [26, [245, 130, 50]], [34, [230, 70, 60]]];
    if (t <= st[0][0]) return `rgb(${st[0][1]})`; if (t >= st[st.length - 1][0]) return `rgb(${st[st.length - 1][1]})`;
    for (let i = 1; i < st.length; i++) if (t <= st[i][0]) { const [a, ca] = st[i - 1], [b, cb] = st[i], k = (t - a) / (b - a); return `rgb(${ca.map((v, j) => Math.round(v + (cb[j] - v) * k)).join(',')})`; }
  },
  hm: (d) => d.toLocaleTimeString(HG_LOC(), { hour: '2-digit', minute: '2-digit' }),
};
